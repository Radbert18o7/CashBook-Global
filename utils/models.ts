export type CurrencyCode = string;

export type ThemeMode = 'light' | 'dark' | 'system';

export type BookMemberRole = 'PRIMARY_ADMIN' | 'ADMIN' | 'EMPLOYEE';

export type EntryType = 'CASH_IN' | 'CASH_OUT';

export type ISODateString = string; // e.g. "2026-03-30"

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  language: string;
  currency: CurrencyCode;
  theme: ThemeMode;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  created_at?: unknown;
  logo_url?: string;
  address?: string;
  phone?: string;
  website?: string;
  currency_code?: string;
  timezone?: string;
}

export interface Book {
  id: string;
  business_id: string;
  name: string;
  created_by: string;
  last_entry_date?: unknown;
  settings?: Record<string, unknown>;
}

export interface Entry {
  id: string;
  book_id: string;
  entry_date: unknown; // Timestamp from Firestore
  created_at?: unknown;
  created_by: string;
  deleted_at?: unknown;
  type: EntryType;
  amount: number;
  contact_id?: string;
  contact_name?: string | null;
  remark?: string | null;
  category_id?: string;
  category_name?: string;
  payment_mode_id?: string;
  payment_mode_name?: string;
  custom_fields?: Record<string, unknown>;
  image_url?: string | null;
}

export interface EntryFilters {
  fromDate?: ISODateString;
  toDate?: ISODateString;
  type?: EntryType | 'ALL';
}

