import { supabase } from '../client';
import { storage } from '../../services/storage';
import { ConflictResolver, SyncRecord } from './ConflictResolver';

type Repositories = typeof import('../../database/repositories');

const tryGetRepositories = (): Repositories | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../database/repositories') as Repositories;
  } catch {
    return null;
  }
};

const isWatermelonDbUnavailableError = (e: any): boolean =>
  String(e?.message || e).includes('NativeModules.DatabaseBridge is not defined');

export type ScanMetadata = SyncRecord & {
  id: string; // scan_id
  user_id: string;
  type: string;
  created_at: number;
  updated_at: number;
  device_id: string;
  product_type?: string | null;
  verdict?: string | null;
  flags?: { highSodium?: boolean; highSugar?: boolean; highSaturatedFat?: boolean };
  allergens_count?: number;
};

export type SyncStatus = {
  state: 'idle' | 'syncing' | 'error';
  lastSyncAt?: number | null;
  error?: string | null;
};

type Listener = (s: SyncStatus) => void;

const LAST_SYNC_KEY = 'sync:last_scan_metadata_sync_at';
const INDEX_KEY = 'sync:scan_metadata_index_v1';

const safeJsonParse = (v: string | null): any => {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const nowMs = () => Date.now();

const assertScanMetadataPayload = (payload: any[]): void => {
  const allowed = new Set([
    'id',
    'user_id',
    'type',
    'created_at',
    'updated_at',
    'device_id',
    'product_type',
    'verdict',
    'flags',
    'allergens_count',
    // from SyncRecord
    'deleted',
  ]);

  const forbidden = new Set([
    // common health/sensitive blobs
    'data',
    'image',
    'image_uri',
    'ocr',
    'ocr_text',
    'ingredients',
    'ingredientsText',
    'analysis',
    'recommendations',
    'summary',
    'report',
    'health_profile',
    'health_profile_id',
    'conditions',
    'allergies',
    'medications',
    'visionResult',
    'nutritionResult',
    'allergyResult',
  ]);

  for (const row of payload) {
    if (!row || typeof row !== 'object') throw new Error('Supabase sync blocked: payload row is not an object');
    for (const k of Object.keys(row)) {
      if (forbidden.has(k)) {
        throw new Error(`Supabase sync blocked: forbidden key '${k}' present in scan_metadata payload`);
      }
      if (!allowed.has(k)) {
        throw new Error(`Supabase sync blocked: non-whitelisted key '${k}' present in scan_metadata payload`);
      }
    }
  }
};

const getDeviceId = async (): Promise<string> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-device-info');
    const fn = mod?.getUniqueId ?? mod?.default?.getUniqueId;
    if (typeof fn === 'function') {
      const id = await fn();
      if (id) return String(id);
    }
  } catch {
    // ignore
  }
  return 'unknown_device';
};

const anonymizeScanToMetadata = async (scan: any, userId: string, deviceId: string): Promise<ScanMetadata> => {
  // Scan.data may contain sensitive health analysis; we only extract non-health metadata.
  let parsed: any = null;
  try {
    parsed = typeof scan?.data === 'string' ? JSON.parse(scan.data) : scan?.data;
  } catch {
    parsed = null;
  }

  const vision = parsed?.visionResult ?? parsed?.vision ?? parsed;
  const nutrition = parsed?.nutritionResult ?? parsed?.nutrition;
  const allergy = parsed?.allergyResult;
  const recommendation = parsed?.recommendation ?? parsed;

  const flags = nutrition?.flags ?? null;
  const allergensCount = Array.isArray(allergy?.matchedAllergens)
    ? allergy.matchedAllergens.length
    : Array.isArray(parsed?.ocrResult?.allergens)
      ? parsed.ocrResult.allergens.length
      : 0;

  const createdAt =
    typeof scan?.createdAt === 'number'
      ? scan.createdAt
      : typeof scan?._raw?.created_at === 'number'
        ? scan._raw.created_at
        : nowMs();

  return {
    id: String(scan?.id ?? ''),
    user_id: userId,
    type: String(scan?.type ?? 'product_scan'),
    created_at: createdAt,
    updated_at: createdAt,
    device_id: deviceId,
    product_type: vision?.productType ?? null,
    verdict: recommendation?.verdict ?? null,
    flags: flags
      ? {
          ...(flags?.highSodium ? { highSodium: true } : null),
          ...(flags?.highSugar ? { highSugar: true } : null),
          ...(flags?.highSaturatedFat ? { highSaturatedFat: true } : null),
        }
      : undefined,
    allergens_count: allergensCount,
  };
};

class SyncManagerSingleton {
  private status: SyncStatus = { state: 'idle', lastSyncAt: null, error: null };
  private listeners: Set<Listener> = new Set();
  private running = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  private setStatus(next: Partial<SyncStatus>) {
    this.status = { ...this.status, ...next };
    for (const l of this.listeners) {
      try {
        l(this.status);
      } catch {
        // ignore
      }
    }
  }

  private async loadIndex(): Promise<Record<string, ScanMetadata>> {
    const raw = await storage.getItem(INDEX_KEY);
    const parsed = safeJsonParse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, ScanMetadata>;
    return {};
  }

  private async saveIndex(index: Record<string, ScanMetadata>): Promise<void> {
    await storage.setItem(INDEX_KEY, JSON.stringify(index));
  }

  private async getLastSyncAt(): Promise<number> {
    const raw = await storage.getItem(LAST_SYNC_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  private async setLastSyncAt(ts: number): Promise<void> {
    await storage.setItem(LAST_SYNC_KEY, String(ts));
    this.setStatus({ lastSyncAt: ts });
  }

  /**
   * Push anonymized scan metadata on sign-in.
   * Never pushes health profile, scan images, OCR text, ingredients, or full analysis JSON.
   */
  async onSignIn(userId: string): Promise<void> {
    await this.syncScanMetadata(userId);
  }

  /**
   * On app open, pull changes across devices and reconcile.
   */
  async onAppOpen(userId: string): Promise<void> {
    await this.syncScanMetadata(userId);
  }

  async syncScanMetadata(userId: string): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.setStatus({ state: 'syncing', error: null });

    try {
      const deviceId = await getDeviceId();
      const repos = tryGetRepositories();

      // Local scan metadata generation
      const localIndex = await this.loadIndex();
      const localMetadata: Record<string, ScanMetadata> = { ...localIndex };

      if (repos) {
        try {
          const scans = await repos.ScanRepository.getScans(userId);
          for (const s of scans) {
            const meta = await anonymizeScanToMetadata(s as any, userId, deviceId);
            if (meta.id) {
              const prev = localMetadata[meta.id] ?? null;
              const resolved = ConflictResolver.resolve(prev as any, meta as any) as any;
              if (resolved) localMetadata[meta.id] = resolved;
            }
          }
        } catch (e) {
          if (!isWatermelonDbUnavailableError(e)) {
            throw e;
          }
        }
      }

      // Push: upsert metadata
      const payload = Object.values(localMetadata);
      if (payload.length > 0) {
        assertScanMetadataPayload(payload as any[]);
        const { error } = await supabase
          .from('scan_metadata')
          .upsert(payload, { onConflict: 'id' });
        if (error) throw error;
      }

      // Pull: changes since last sync
      const lastSyncAt = await this.getLastSyncAt();
      const { data: remoteRows, error: pullError } = await supabase
        .from('scan_metadata')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSyncAt)
        .limit(500);

      if (pullError) throw pullError;

      if (Array.isArray(remoteRows)) {
        for (const r of remoteRows as any[]) {
          const id = String(r?.id ?? '');
          if (!id) continue;
          const normalized: ScanMetadata = {
            ...r,
            id,
            created_at: Number(r?.created_at ?? 0),
            updated_at: Number(r?.updated_at ?? r?.created_at ?? 0),
          };

          const prev = localMetadata[id] ?? null;
          const resolved = ConflictResolver.resolve(prev as any, normalized as any) as any;
          if (resolved) localMetadata[id] = resolved;
        }
      }

      await this.saveIndex(localMetadata);
      await this.setLastSyncAt(nowMs());
      this.setStatus({ state: 'idle', error: null });
    } catch (e: any) {
      this.setStatus({ state: 'error', error: String(e?.message || e) });
    } finally {
      this.running = false;
    }
  }
}

export const SyncManager = new SyncManagerSingleton();
