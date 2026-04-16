import { createContext, useContext, type ReactNode } from 'react';

import { PendingApprovalGate } from '@/app/(auth)/pending-approval';
import { useAuthStore } from '@/stores/auth-store';

interface ApprovalContextValue {
  approved: boolean;
  approvalStatus: string | undefined;
}

const ApprovalContext = createContext<ApprovalContextValue>({
  approved: false,
  approvalStatus: undefined,
});

export function ApprovalProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const approved = user?.approvalStatus === 'approved';

  if (!approved) {
    return <PendingApprovalGate />;
  }

  return (
    <ApprovalContext.Provider value={{ approved, approvalStatus: user?.approvalStatus }}>
      {children}
    </ApprovalContext.Provider>
  );
}

/** Consume inside any screen within the (app) group */
export function useApproval() {
  return useContext(ApprovalContext);
}
