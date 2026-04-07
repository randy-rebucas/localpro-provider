/**
 * Provider Profile API
 *
 * Documented endpoints (§18 of API reference):
 *   POST   /api/providers/profile/service-areas        — add service area (max 10)
 *   DELETE /api/providers/profile/service-areas/[id]   — remove service area
 *
 * Undocumented endpoints used by best-guess REST convention:
 *   PATCH  /api/providers/profile                      — update bio / skills / hourly rate
 *   POST   /api/providers/profile/portfolio            — add portfolio item
 *   DELETE /api/providers/profile/portfolio/[id]       — remove portfolio item
 *
 * NOT used (certifications are managed by PESO only via /api/peso/providers/[id]/certifications).
 * Providers read their certifications from GET /api/providers/profile (getProviderProfile in auth.ts).
 */
import { api } from './client';

export interface ServiceArea {
  _id: string;
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

export interface PortfolioItem {
  _id: string;
  title: string;
  description?: string;
  photoUrl: string;
  createdAt: string;
}

export interface UpdateProfilePayload {
  bio?: string;
  hourlyRate?: number;
  yearsExperience?: number;
  availabilityStatus?: string;
  skills?: { skill: string; yearsExperience: number }[];
}

/** Undocumented — best-guess PATCH on the profile resource */
export async function updateProviderProfile(payload: UpdateProfilePayload): Promise<void> {
  await api.patch('/api/providers/profile', payload);
}

/**
 * Documented: POST /api/providers/profile/service-areas
 * Response shape: updated serviceAreas array (may be wrapped or direct).
 */
export async function addServiceArea(payload: {
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}): Promise<ServiceArea[]> {
  const { data } = await api.post('/api/providers/profile/service-areas', payload);
  // Response is the updated service-areas array (may be nested or direct)
  if (Array.isArray(data)) return data as ServiceArea[];
  return (data as any).serviceAreas ?? [];
}

/** Documented: DELETE /api/providers/profile/service-areas/[id] */
export async function removeServiceArea(id: string): Promise<void> {
  await api.delete(`/api/providers/profile/service-areas/${id}`);
}

/** Undocumented — best-guess POST on the portfolio sub-resource */
export async function addPortfolioItem(payload: {
  title: string;
  description?: string;
  photoUri: string;
}): Promise<void> {
  const form = new FormData();
  form.append('title', payload.title);
  if (payload.description) form.append('description', payload.description);
  form.append('photo', { uri: payload.photoUri, name: 'portfolio.jpg', type: 'image/jpeg' } as any);
  await api.post('/api/providers/profile/portfolio', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** Undocumented — best-guess DELETE on the portfolio sub-resource */
export async function removePortfolioItem(id: string): Promise<void> {
  await api.delete(`/api/providers/profile/portfolio/${id}`);
}
