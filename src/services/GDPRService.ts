import database from '../database/DatabaseManager';

type Repositories = typeof import('../database/repositories');

type ExportResult = {
  path: string;
  json: any;
};

const tryGetRepositories = (): Repositories | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../database/repositories') as Repositories;
  } catch {
    return null;
  }
};

async function getFileSystem() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-file-system/legacy') as any;
  } catch {
    throw new Error('expo-file-system is required for GDPR export');
  }
}

const nowMs = () => Date.now();

export const GDPRService = {
  async exportUserDataToJsonFile(userId: string): Promise<ExportResult> {
    const repos = tryGetRepositories();
    if (!repos) {
      throw new Error('Local database repositories are unavailable in this runtime');
    }

    const profile = await repos.UserRepository.getHealthProfile(userId);
    const hpId = profile?.id ?? null;

    const [conditions, allergies, medications, scans, reports] = await Promise.all([
      hpId ? repos.ConditionRepository.getConditions(hpId) : Promise.resolve([]),
      hpId ? repos.AllergyRepository.getAllergies(hpId) : Promise.resolve([]),
      hpId ? repos.MedicationRepository.getMedications(hpId) : Promise.resolve([]),
      repos.ScanRepository.getScans(userId),
      repos.ReportRepository.getReports(userId),
    ]);

    const json = {
      exported_at: nowMs(),
      user_id: userId,
      health_profile: profile,
      conditions,
      allergies,
      medications,
      scans,
      reports,
    };

    const FileSystem: any = await getFileSystem();
    const baseDir = FileSystem.documentDirectory ?? '';
    const fileName = `gdpr_export_${encodeURIComponent(String(userId))}_${nowMs()}.json`;
    const path = `${baseDir}${fileName}`;

    await FileSystem.writeAsStringAsync(path, JSON.stringify(json, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { path, json };
  },

  async wipeLocalUserData(userId: string, opts?: { includeScans?: boolean; includeReports?: boolean }): Promise<void> {
    const includeScans = opts?.includeScans ?? true;
    const includeReports = opts?.includeReports ?? true;

    const healthProfiles = database.collections.get<any>('health_profiles');
    const conditions = database.collections.get<any>('conditions');
    const allergies = database.collections.get<any>('allergies');
    const medications = database.collections.get<any>('medications');
    const scans = database.collections.get<any>('scans');
    const reports = database.collections.get<any>('reports');

    await database.write(async () => {
      const profiles = await healthProfiles.query().fetch();
      const userProfiles = (profiles as any[]).filter((p) => String(p?._raw?.user_id ?? p?.userId ?? '') === String(userId));
      const hpIds = userProfiles.map((p) => String(p?.id ?? '')).filter(Boolean);

      if (hpIds.length > 0) {
        const condRows = await conditions.query().fetch();
        for (const r of condRows as any[]) {
          if (hpIds.includes(String(r?._raw?.health_profile_id ?? ''))) {
            await r.markAsDeleted();
          }
        }

        const allergyRows = await allergies.query().fetch();
        for (const r of allergyRows as any[]) {
          if (hpIds.includes(String(r?._raw?.health_profile_id ?? ''))) {
            await r.markAsDeleted();
          }
        }

        const medRows = await medications.query().fetch();
        for (const r of medRows as any[]) {
          if (hpIds.includes(String(r?._raw?.health_profile_id ?? ''))) {
            await r.markAsDeleted();
          }
        }
      }

      if (includeScans) {
        const scanRows = await scans.query().fetch();
        for (const r of scanRows as any[]) {
          if (String(r?._raw?.user_id ?? r?.userId ?? '') === String(userId)) {
            await r.markAsDeleted();
          }
        }
      }

      if (includeReports) {
        const reportRows = await reports.query().fetch();
        for (const r of reportRows as any[]) {
          if (String(r?._raw?.user_id ?? r?.userId ?? '') === String(userId)) {
            await r.markAsDeleted();
          }
        }
      }

      for (const p of userProfiles) {
        await p.markAsDeleted();
      }
    });
  },
};
