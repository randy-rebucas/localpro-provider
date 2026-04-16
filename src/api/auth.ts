import { api } from './client';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  isVerified: boolean;
  approvalStatus: string | null;   // "pending" | "approved" | "rejected" | null = unknown (not yet fetched)
  isSuspended?: boolean;
  kycStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  phone?: string | null;
  accountType?: 'personal' | 'business';
  agencyId?: string | null;
  addresses?: {
    _id: string;
    label: string;
    address: string;
    isDefault: boolean;
    coordinates?: { lat: number; lng: number };
  }[];
}

export interface ProviderProfile {
  _id: string;
  bio: string;
  skills: { skill: string; yearsExperience: number }[];
  portfolioItems: unknown[];
  serviceAreas: { label: string; address: string }[];
  certifications: unknown[];
  hourlyRate: number | null;
  yearsExperience: number;
  avgRating: number;
  completedJobCount: number;
  completionRate: number;
  availabilityStatus: string;
  pesoVerificationTags: string[];
  userId: {
    _id: string;
    name: string;
    email: string;
    isVerified: boolean;
    avatar: string | null;
    kycStatus: string;
  };
  /** Computed client-side — not from the API */
  completionPercent: number;
}

/** Normalise the raw API user to our AuthUser shape.
 *  NOTE: /api/auth/me does NOT return approvalStatus — only /api/auth/login does.
 *  We default to 'approved' so bootstrap doesn't falsely gate approved providers.
 *  The backend enforces real access control regardless of this client-side value.
 */
function normaliseUser(raw: Record<string, any>): AuthUser {
  return {
    _id:            raw._id ?? raw.id,
    name:           raw.name,
    email:          raw.email,
    role:           raw.role,
    avatar:         raw.avatar ?? null,
    isVerified:     raw.isVerified ?? raw.isEmailVerified ?? false,
    approvalStatus: raw.approvalStatus ?? null,
    isSuspended:    raw.isSuspended ?? false,
    kycStatus:      raw.kycStatus ?? 'none',
    phone:          raw.phone ?? null,
    accountType:    raw.accountType ?? 'personal',
    agencyId:       raw.agencyId ?? null,
    addresses:      raw.addresses ?? [],
  };
}

/** Compute a profile completion percentage from the provider profile */
function calcCompletionPercent(raw: Record<string, any>): number {
  const checks = [
    !!raw.bio?.trim(),
    (raw.skills?.length ?? 0) > 0,
    (raw.serviceAreas?.length ?? 0) > 0,
    raw.hourlyRate != null,
    (raw.yearsExperience ?? 0) > 0,
    !!raw.userId?.avatar,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<Record<string, any>>('/api/auth/me');
  return normaliseUser(data);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await api.post<{ user: Record<string, any> }>('/api/auth/login', {
    email,
    password,
  });
  return normaliseUser(data.user);
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  role: 'provider';
}): Promise<{ message: string }> {
  const { data } = await api.post('/api/auth/register', payload);
  return data;
}

export async function sendPhoneOtp(phone: string): Promise<{ message: string }> {
  const { data } = await api.post('/api/auth/phone/send', { phone });
  return data;
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<AuthUser> {
  const { data } = await api.post<{ user: Record<string, any> }>('/api/auth/phone/verify', {
    phone,
    otp,
  });
  return normaliseUser(data.user);
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post('/api/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  const { data } = await api.post('/api/auth/reset-password', { token, password });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function getProviderProfile(): Promise<ProviderProfile> {
  const { data } = await api.get<Record<string, any>>('/api/providers/profile');
  return {
    ...data,
    completionPercent: calcCompletionPercent(data),
  } as ProviderProfile;
}
