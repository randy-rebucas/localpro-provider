import { api } from './client';

export interface LoyaltyAccount {
  points: number;
  tier: string;
}

export interface LoyaltyLedgerEntry {
  _id: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface LoyaltyData {
  account: LoyaltyAccount;
  ledger: LoyaltyLedgerEntry[];
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  referredCount: number;
}

export async function getLoyalty(): Promise<LoyaltyData> {
  const { data } = await api.get<LoyaltyData>('/api/loyalty');
  return {
    account: data.account ?? { points: 0, tier: 'Bronze' },
    ledger: Array.isArray(data.ledger) ? data.ledger : [],
  };
}

export async function getReferral(): Promise<ReferralData> {
  const { data } = await api.get<ReferralData>('/api/loyalty/referral');
  return data;
}
