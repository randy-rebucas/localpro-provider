import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthUser } from '@/api/auth';

export const APPROVAL_STATUS_KEY = 'provider_approval_status';

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
  setUser: (user) => {
    // Persist real approval status so bootstrap can restore it on next launch
    if (user.approvalStatus) {
      SecureStore.setItemAsync(APPROVAL_STATUS_KEY, user.approvalStatus).catch(() => {});
    }
    set({ user, isLoading: false });
  },
  clearUser: () => {
    SecureStore.deleteItemAsync(APPROVAL_STATUS_KEY).catch(() => {});
    set({ user: null, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));

/** Helper — is this user's account fully approved to use the app? */
export function isProviderApproved(user: AuthUser | null): boolean {
  return user?.approvalStatus === 'approved' && !user?.isSuspended;
}
