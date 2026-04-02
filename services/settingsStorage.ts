import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@cashbook/settings/';

export const settingsKeys = {
  appLock: `${PREFIX}app_lock`,
  appLockPin: `${PREFIX}app_lock_pin`,
  biometric: `${PREFIX}biometric`,
  dailyReminder: `${PREFIX}daily_reminder`,
  reminderHour: `${PREFIX}reminder_hour`,
  autoBackup: `${PREFIX}auto_backup`,
  textSize: `${PREFIX}text_size`,
} as const;

export async function getSettingBool(key: string, defaultValue = false): Promise<boolean> {
  const v = await AsyncStorage.getItem(key);
  if (v === null) return defaultValue;
  return v === '1' || v === 'true';
}

export async function setSettingBool(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? '1' : '0');
}

export async function getSettingString(key: string, defaultValue = ''): Promise<string> {
  return (await AsyncStorage.getItem(key)) ?? defaultValue;
}

export async function setSettingString(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}
