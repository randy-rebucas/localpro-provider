import { create } from 'zustand';

import type { AuthUser } from '@/api/auth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  clearUser: () => set({ user: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));

/** Helper — is this user's account fully approved to use the app? */
export function isProviderApproved(user: AuthUser | null): boolean {
  return user?.approvalStatus === 'approved' && !user?.isSuspended;
}
