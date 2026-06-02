export const TRASH_RETENTION_DAYS = 7;

export function getTrashDaysRemaining(deletedAt: string): number {
  const deletedMs = new Date(deletedAt).getTime();
  const purgeMs = deletedMs + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((purgeMs - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export function formatTrashPurgeDate(deletedAt: string): string {
  const purge = new Date(deletedAt);
  purge.setDate(purge.getDate() + TRASH_RETENTION_DAYS);
  return purge.toLocaleDateString();
}
