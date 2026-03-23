import { create } from 'zustand';

interface UserState {
  user: any | null;
  healthProfileId: string | null;
  setUser: (user: any) => void;
  setHealthProfileId: (id: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  healthProfileId: null,
  setUser: (user) => set({ user }),
  setHealthProfileId: (id) => set({ healthProfileId: id }),
}));
