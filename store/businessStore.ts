import { create } from 'zustand';

import type { Business } from '@/utils/models';

type BusinessState = {
  businesses: Business[];
  currentBusiness: Business | null;
  setBusinesses: (businesses: Business[]) => void;
  setCurrentBusiness: (business: Business | null) => void;
  addBusiness: (b: Business) => void;
  updateBusiness: (id: string, data: Partial<Business>) => void;
  removeBusiness: (id: string) => void;
};

export const useBusinessStore = create<BusinessState>((set) => ({
  businesses: [],
  currentBusiness: null,
  setBusinesses: (businesses) => set(() => ({ businesses })),
  setCurrentBusiness: (business) => set(() => ({ currentBusiness: business })),
  addBusiness: (b) =>
    set((state) => ({
      businesses: [b, ...state.businesses],
    })),
  updateBusiness: (id, data) =>
    set((state) => {
      const businesses = state.businesses.map((b) => (b.id === id ? { ...b, ...data } : b));
      const currentBusiness =
        state.currentBusiness?.id === id ? { ...state.currentBusiness, ...data } : state.currentBusiness;
      return { businesses, currentBusiness };
    }),
  removeBusiness: (id) =>
    set((state) => ({
      businesses: state.businesses.filter((b) => b.id !== id),
      currentBusiness: state.currentBusiness?.id === id ? null : state.currentBusiness,
    })),
}));

