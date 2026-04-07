import { api } from './client';

export interface WalletSummary {
  balance: number;
  thisMonth: number;
  allTime: number;
  pendingWithdrawals: number;
}

export interface Transaction {
  id: string;
  type: 'escrow_released' | 'commission' | 'withdrawal' | 'referral_bonus' | string;
  description: string;
  amount: number;
  createdAt: string;
}

export async function getWallet(): Promise<WalletSummary> {
  const { data } = await api.get<WalletSummary>('/api/wallet');
  return data;
}

export async function getTransactions(params?: { type?: string; page?: number }): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>('/api/transactions', { params });
  return data;
}

export async function requestWithdrawal(payload: {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}): Promise<void> {
  await api.post('/api/wallet/withdraw', payload);
}
