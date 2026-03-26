export type SyncRecord = {
  id: string;
  updated_at: number;
  [k: string]: any;
};

export const ConflictResolver = {
  /**
   * Last-write-wins based on numeric updated_at (ms since epoch).
   */
  resolve<T extends SyncRecord>(local: T | null, remote: T | null): T | null {
    if (!local && !remote) return null;
    if (!local) return remote;
    if (!remote) return local;

    const lu = typeof local.updated_at === 'number' ? local.updated_at : 0;
    const ru = typeof remote.updated_at === 'number' ? remote.updated_at : 0;

    return ru >= lu ? remote : local;
  },
};
