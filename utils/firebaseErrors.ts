/** True when err is a Firebase `permission-denied` (Firestore / Storage-style). */
export function isFirebasePermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  return code === 'permission-denied';
}
