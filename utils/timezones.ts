const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Moscow',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function listTimezones(): string[] {
  try {
    const IntlAny = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    if (typeof IntlAny.supportedValuesOf === 'function') {
      return IntlAny.supportedValuesOf('timeZone');
    }
  } catch {
    /* noop */
  }
  return FALLBACK_TIMEZONES;
}
