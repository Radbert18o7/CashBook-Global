import Constants from 'expo-constants';

export const APP_NAME = 'CashBook Global';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Web client URL for “CashBook for Web”. */
export const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'https://cashbookglobal.app';
