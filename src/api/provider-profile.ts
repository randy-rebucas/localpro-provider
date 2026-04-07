/**
 * Provider Profile API  (mobile-provider-profile-api.md)
 *
 * Documented endpoints:
 *   GET    /api/providers/profile                          — full profile (via auth.ts getProviderProfile)
 *   PUT    /api/providers/profile                          — save profile (bio, skills, schedule, portfolio…)
 *   POST   /api/providers/profile/service-areas            — add service area (max 10)
 *   DELETE /api/providers/profile/service-areas/[id]       — remove service area
 *   POST   /api/providers/profile/generate-bio             — AI bio (Gold+ tier)
 *
 *   POST   /api/upload                                     — upload file to Cloudinary
 *   PUT    /api/auth/me                                    — update user (phone, avatar)
 *   POST   /api/auth/me/addresses                          — add address
 *   PATCH  /api/auth/me/addresses/[id]                     — update / set default address
 *   DELETE /api/auth/me/addresses/[id]                     — remove address
 *
 *   POST   /api/ai/suggest-skills                         — AI skill suggestions (Gold+)
 *
 *   POST   /api/kyc                                        — submit KYC documents
 *
 *   GET    /api/provider/boost                             — active boosts + prices
 *   POST   /api/provider/boost                             — purchase boost
 *   DELETE /api/provider/boost/[id]                        — cancel boost
 *
 *   GET    /api/provider/training                          — course list
 *   POST   /api/provider/training/[id]/enroll              — enroll in free course
 *   GET    /api/provider/training/enrollments              — my enrollments
 */
import { api } from './client';

/* ─── Supporting types ──────────────────────────────────────────────── */

export interface ServiceArea {
  _id: string;
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

export interface PortfolioItem {
  _id?: string;
  title: string;
  description?: string;
  imageUrl?: string;   // Cloudinary URL
}

export interface Skill {
  skill: string;
  yearsExperience: number;
  hourlyRate: string;   // PHP amount as string, e.g. "500"
}

export interface WorkSlot {
  enabled: boolean;
  from: string;   // "HH:MM"
  to: string;
}

export interface WeeklySchedule {
  mon: WorkSlot; tue: WorkSlot; wed: WorkSlot; thu: WorkSlot;
  fri: WorkSlot; sat: WorkSlot; sun: WorkSlot;
}

export interface Address {
  _id: string;
  label: string;
  address: string;
  isDefault: boolean;
  coordinates?: { lat: number; lng: number };
}

export interface UpdateProfilePayload {
  bio?: string;
  skills?: Skill[];
  yearsExperience?: number;
  hourlyRate?: number;
  availabilityStatus?: 'available' | 'busy' | 'unavailable';
  schedule?: WeeklySchedule;
  portfolioItems?: PortfolioItem[];
  maxConcurrentJobs?: number;
}

export const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: { enabled: true,  from: '08:00', to: '17:00' },
  tue: { enabled: true,  from: '08:00', to: '17:00' },
  wed: { enabled: true,  from: '08:00', to: '17:00' },
  thu: { enabled: true,  from: '08:00', to: '17:00' },
  fri: { enabled: true,  from: '08:00', to: '17:00' },
  sat: { enabled: false, from: '08:00', to: '12:00' },
  sun: { enabled: false, from: '08:00', to: '12:00' },
};

/* ─── Tier helper ───────────────────────────────────────────────────── */

export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ProviderTier {
  tier: TierName;
  label: string;
  color: string;
  hasAIAccess: boolean;
  nextMsg: string;
}

export function getProviderTier(
  completedJobCount: number,
  avgRating: number,
  completionRate: number,
): ProviderTier {
  if (completedJobCount >= 50 && avgRating >= 4.8 && completionRate >= 95) {
    return { tier: 'platinum', label: 'Platinum', color: '#94a3b8', hasAIAccess: true, nextMsg: 'You\'ve reached the highest tier!' };
  }
  if (completedJobCount >= 15 && avgRating >= 4.5 && completionRate >= 90) {
    const left = 50 - completedJobCount;
    return { tier: 'gold', label: 'Gold', color: '#f59e0b', hasAIAccess: true, nextMsg: left > 0 ? `${left} more jobs to Platinum` : 'Platinum unlocked!' };
  }
  if (completedJobCount >= 5 && avgRating >= 4.0 && completionRate >= 80) {
    const left = 15 - completedJobCount;
    return { tier: 'silver', label: 'Silver', color: '#9e9e9e', hasAIAccess: false, nextMsg: left > 0 ? `${left} more jobs + rating ≥ 4.5 for Gold (AI access)` : 'Gold almost there!' };
  }
  const left = 5 - completedJobCount;
  return { tier: 'bronze', label: 'Bronze', color: '#cd7f32', hasAIAccess: false, nextMsg: left > 0 ? `${left} more jobs for Silver` : 'Silver almost there!' };
}

/* ─── Profile update ────────────────────────────────────────────────── */

/** PUT /api/providers/profile — save all editable fields in one call */
export async function updateProviderProfile(payload: UpdateProfilePayload): Promise<void> {
  await api.put('/api/providers/profile', payload);
}

/* ─── Service areas ─────────────────────────────────────────────────── */

export async function addServiceArea(payload: {
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}): Promise<ServiceArea[]> {
  const { data } = await api.post('/api/providers/profile/service-areas', payload);
  if (Array.isArray(data)) return data as ServiceArea[];
  return (data as any).serviceAreas ?? [];
}

export async function removeServiceArea(id: string): Promise<void> {
  await api.delete(`/api/providers/profile/service-areas/${id}`);
}

/* ─── File upload ───────────────────────────────────────────────────── */

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes?: number;
}

/** POST /api/upload — upload to Cloudinary via the server */
export async function uploadFile(
  uri: string,
  folder: 'avatars' | 'kyc' | 'portfolio',
  mimeType = 'image/jpeg',
): Promise<UploadResult> {
  // Normalise mime → extension (jpeg → jpg to avoid server rejections)
  const rawExt = mimeType.split('/')[1] ?? 'jpg';
  const ext    = rawExt === 'jpeg' ? 'jpg' : rawExt;

  // Prefer the real filename from the URI, fall back to a generic name
  const uriFilename = uri.split('/').pop()?.split('?')[0];
  const filename    = uriFilename && uriFilename.includes('.') ? uriFilename : `upload.${ext}`;

  const form = new FormData();
  form.append('file', { uri, name: filename, type: mimeType } as any);
  form.append('folder', folder);
  const { data } = await api.post<UploadResult>('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/* ─── User update (phone / avatar) ─────────────────────────────────── */

/** PUT /api/auth/me — update phone number or avatar URL */
export async function updateMe(payload: { phone?: string | null; avatar?: string }): Promise<void> {
  await api.put('/api/auth/me', payload);
}

/* ─── Saved addresses ───────────────────────────────────────────────── */

export async function addAddress(payload: {
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}): Promise<Address[]> {
  const { data } = await api.post<Address[]>('/api/auth/me/addresses', payload);
  return Array.isArray(data) ? data : (data as any).addresses ?? [];
}

export async function updateAddress(
  id: string,
  payload: { label?: string; address?: string; isDefault?: boolean; coordinates?: { lat: number; lng: number } },
): Promise<Address[]> {
  const { data } = await api.patch<Address[]>(`/api/auth/me/addresses/${id}`, payload);
  return Array.isArray(data) ? data : (data as any).addresses ?? [];
}

export async function deleteAddress(id: string): Promise<Address[]> {
  const { data } = await api.delete<Address[]>(`/api/auth/me/addresses/${id}`);
  return Array.isArray(data) ? data : (data as any).addresses ?? [];
}

/* ─── AI features (Gold+ tier) ──────────────────────────────────────── */

/** POST /api/providers/profile/generate-bio — requires Gold+ tier */
export async function generateBio(): Promise<string> {
  const { data } = await api.post<{ bio: string } | { error: string; upgradeRequired?: boolean }>(
    '/api/providers/profile/generate-bio',
  );
  if ('error' in data) throw new Error((data as any).error);
  return (data as { bio: string }).bio;
}

/** POST /api/ai/suggest-skills — requires Gold+ tier */
export async function suggestSkills(bio: string, existingSkills: string[]): Promise<string[]> {
  const { data } = await api.post<{ skills: string[] } | { error: string }>(
    '/api/ai/suggest-skills',
    { bio, existingSkills },
  );
  if ('error' in data) throw new Error((data as any).error);
  return (data as { skills: string[] }).skills ?? [];
}

/* ─── KYC ───────────────────────────────────────────────────────────── */

export type KycDocType = 'government_id' | 'tesda_certificate' | 'business_permit' | 'selfie_with_id' | 'other';

export interface KycDocument {
  type: KycDocType;
  url: string;
}

export async function submitKyc(documents: KycDocument[]): Promise<void> {
  await api.post('/api/kyc', { documents });
}

/* ─── Provider Boost ────────────────────────────────────────────────── */

export type BoostType = 'featured_provider' | 'top_search' | 'homepage_highlight';

export interface BoostItem {
  _id: string;
  type: BoostType;
  startedAt?: string;
  expiresAt: string;
}

export interface BoostData {
  activeBoosts: BoostItem[];
  history: BoostItem[];
  balance: number;
  prices: Record<BoostType, number>;
}

export async function getBoostData(): Promise<BoostData> {
  const { data } = await api.get<BoostData>('/api/provider/boost');
  return data;
}

export async function purchaseBoost(
  type: BoostType,
  payWith: 'wallet' | 'paymongo',
): Promise<{ boost?: BoostItem; newBalance?: number; checkoutUrl?: string }> {
  const { data } = await api.post('/api/provider/boost', { type, payWith });
  return data;
}

export async function cancelBoost(id: string): Promise<void> {
  await api.delete(`/api/provider/boost/${id}`);
}

/* ─── Training ──────────────────────────────────────────────────────── */

export type CourseCategory = 'basic' | 'advanced' | 'safety' | 'custom' | 'certification';

export interface Lesson {
  _id: string;
  title: string;
  content?: string;        // Markdown, only if enrolled
  durationMinutes: number;
  order: number;
  videoUrl?: string;
  imageUrl?: string;
}

export interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: CourseCategory;
  price: number;
  durationMinutes: number;
  badgeSlug: string;
  enrollmentCount: number;
  lessons: Lesson[];
  enrolled?: boolean;
  enrollmentStatus?: 'enrolled' | 'completed' | null;
  completedLessonsCount?: number;
}

export interface Enrollment {
  _id: string;
  providerId: string;
  courseId: string | Course;
  courseTitle: string;
  amountPaid: number;
  status: 'enrolled' | 'completed' | 'refunded';
  completedLessons: string[];
  completedAt: string | null;
  badgeGranted: boolean;
  walletTxId?: string | null;
  paymongoSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetailEnrollment {
  _id: string;
  status: 'enrolled' | 'completed';
  completedLessons: string[];
  completedAt: string | null;
  badgeGranted: boolean;
}

export interface CourseDetail extends Course {
  enrollment: CourseDetailEnrollment | null;
}

export interface Certificate {
  providerName: string;
  courseTitle: string;
  category: CourseCategory;
  badgeSlug: string;
  completedAt: string;
  certificateNumber: string;
}

/* Course list */
export async function getCourses(category?: string): Promise<Course[]> {
  const { data } = await api.get<{ courses: Course[] }>('/api/provider/training', {
    params: category ? { category } : undefined,
  });
  return data.courses ?? [];
}

/* Course detail — includes lesson content if enrolled */
export async function getCourseDetail(id: string): Promise<CourseDetail> {
  const { data } = await api.get<{ course: CourseDetail }>(`/api/provider/training/${id}`);
  return data.course;
}

/* Enrollments list */
export async function getEnrollments(): Promise<Enrollment[]> {
  const { data } = await api.get<{ enrollments: Enrollment[] }>('/api/provider/training/enrollments');
  return data.enrollments ?? [];
}

/* Enroll via wallet (free or deduct from wallet) */
export async function enrollCourse(id: string): Promise<{ activated: boolean; enrollment: Enrollment }> {
  const { data } = await api.post(`/api/provider/training/${id}/enroll`);
  return data;
}

/* Initiate PayMongo checkout */
export async function checkoutCourse(id: string): Promise<{ checkoutUrl: string; checkoutSessionId: string }> {
  const { data } = await api.post(`/api/provider/training/${id}/checkout`);
  return data;
}

/* Activate enrollment after PayMongo payment */
export async function activateEnrollment(id: string, sessionId: string): Promise<{ activated: boolean; enrollment?: Enrollment }> {
  const { data } = await api.post(`/api/provider/training/${id}/activate`, { sessionId });
  return data;
}

/* Mark a single lesson complete */
export async function completeLessonApi(enrollmentId: string, lessonId: string): Promise<Enrollment> {
  const { data } = await api.post<{ enrollment: Enrollment }>(
    `/api/provider/training/enrollments/${enrollmentId}/lessons/${lessonId}/complete`,
  );
  return data.enrollment;
}

/* Finish course + claim badge */
export async function completeCourse(enrollmentId: string): Promise<Enrollment> {
  const { data } = await api.post<{ enrollment: Enrollment }>(
    `/api/provider/training/enrollments/${enrollmentId}/complete`,
  );
  return data.enrollment;
}

/* Get certificate data for a completed course */
export async function getCertificate(courseId: string): Promise<Certificate> {
  const { data } = await api.get<Certificate>(`/api/provider/training/${courseId}/certificate`);
  return data;
}
