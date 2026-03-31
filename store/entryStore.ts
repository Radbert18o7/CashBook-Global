import { create } from 'zustand';

import type { Entry } from '@/utils/models';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

type LastDoc = QueryDocumentSnapshot | null;

type EntryState = {
  entries: Entry[];
  isLoading: boolean;
  hasMore: boolean;
  lastDoc: LastDoc;
  setEntries: (entries: Entry[]) => void;
  addEntry: (e: Entry) => void;
  updateEntry: (id: string, data: Partial<Entry>) => void;
  removeEntry: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setLastDoc: (doc: LastDoc) => void;
  resetEntries: () => void;
};

export const useEntryStore = create<EntryState>((set) => ({
  entries: [],
  isLoading: false,
  hasMore: true,
  lastDoc: null,
  setEntries: (entries) => set(() => ({ entries })),
  addEntry: (e) =>
    set((state) => ({
      entries: state.entries.some((x) => x.id === e.id) ? state.entries : [e, ...state.entries],
    })),
  updateEntry: (id, data) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),
  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),
  setLoading: (loading) => set(() => ({ isLoading: loading })),
  setHasMore: (hasMore) => set(() => ({ hasMore })),
  setLastDoc: (doc) => set(() => ({ lastDoc: doc })),
  resetEntries: () =>
    set(() => ({
      entries: [],
      isLoading: false,
      hasMore: true,
      lastDoc: null,
    })),
}));

