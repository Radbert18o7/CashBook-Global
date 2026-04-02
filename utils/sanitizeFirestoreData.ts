import {
  DocumentReference,
  FieldValue,
  GeoPoint,
  Timestamp,
} from 'firebase/firestore';

function isPlainObject(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  if (value instanceof Date) return false;
  if (value instanceof Timestamp) return false;
  if (value instanceof GeoPoint) return false;
  if (value instanceof DocumentReference) return false;
  if (value instanceof FieldValue) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isFieldValueLike(value: unknown): boolean {
  if (value instanceof FieldValue) return true;
  if (value === null || typeof value !== 'object') return false;
  return typeof (value as { _methodName?: string })._methodName === 'string';
}

/**
 * Removes `undefined` recursively so Firestore never receives invalid values.
 * Preserves Firestore sentinels (serverTimestamp, increment, etc.), Timestamp, GeoPoint, DocumentReference.
 */
export function sanitizeFirestoreData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value === null) {
      out[key] = null;
      continue;
    }
    if (isFieldValueLike(value)) {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value
        .filter((item) => item !== undefined)
        .map((item) => {
          if (item === null || item === undefined) return item;
          if (isFieldValueLike(item) || item instanceof Timestamp || item instanceof GeoPoint) return item;
          if (isPlainObject(item)) return sanitizeFirestoreData(item as Record<string, unknown>);
          return item;
        });
      continue;
    }
    if (typeof value === 'object' && !isPlainObject(value)) {
      out[key] = value;
      continue;
    }
    if (isPlainObject(value)) {
      out[key] = sanitizeFirestoreData(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}
