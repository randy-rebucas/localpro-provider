import { api } from './client';

/** Shape returned by GET /api/wallet */
interface WalletApiResponse {
  balance: number;
  transactions?: RawTransaction[];
  withdrawals?: { amount: number; status: string; createdAt: string }[];
}

/** Shape returned by GET /api/transactions (paginated) */
interface TransactionsApiResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RawTransaction {
  _id?: string;
  id?: string;
  type: string;
  description?: string;
  amount: number;
  createdAt: string;
}

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

function stableId(): string {
  return `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normaliseTransaction(t: RawTransaction): Transaction {
  return {
    id: t._id ?? t.id ?? stableId(),
    type: t.type,
    description: t.description ?? t.type,
    amount: t.amount,
    createdAt: t.createdAt,
  };
}

export async function getWallet(): Promise<WalletSummary> {
  const { data } = await api.get<WalletApiResponse>('/api/wallet');

  const txns: RawTransaction[] = Array.isArray(data.transactions) ? data.transactions : [];
  const now = new Date();
  const thisMonth = txns
    .filter((t) => {
      const d = new Date(t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.amount > 0;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const allTime = txns.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

  const pendingWithdrawals = (data.withdrawals ?? [])
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  return { balance: data.balance ?? 0, thisMonth, allTime, pendingWithdrawals };
}

export async function getTransactions(params?: { type?: string; page?: number; limit?: number }): Promise<Transaction[]> {
  const { data } = await api.get<TransactionsApiResponse | Transaction[] | RawTransaction[]>(
    '/api/transactions',
    { params },
  );
  if (Array.isArray(data)) return data.map(normaliseTransaction);
  if (Array.isArray((data as TransactionsApiResponse).data)) {
    return (data as TransactionsApiResponse).data.map(normaliseTransaction);
  }
  return [];
}

export async function requestWithdrawal(payload: {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}): Promise<void> {
  await api.post('/api/wallet/withdraw', payload);
}
