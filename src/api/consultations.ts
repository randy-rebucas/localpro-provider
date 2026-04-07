/**
 * Consultations API  (§17 of API reference)
 *
 * Documented:
 *   GET  /api/consultations            — list
 *   POST /api/consultations            — create (clients only)
 *   PUT  /api/consultations/[id]/respond — provider accepts/declines
 *   POST /api/consultations/[id]/messages — send message
 *
 * Undocumented (best-guess REST convention, may 404):
 *   GET  /api/consultations/[id]           — single consultation
 *   GET  /api/consultations/[id]/messages  — fetch thread messages
 */
import { api } from './client';

export interface Consultation {
  _id: string;
  type: 'site_inspection' | 'chat';
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  location?: string;
  photos?: string[];
  estimateAmount?: number;
  estimateNote?: string;
  targetUserId: { _id: string; name: string; email: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationMessage {
  _id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

interface ListResponse {
  data: Consultation[];
  total: number;
  page: number;
  limit: number;
}

export async function getConsultations(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Consultation[]> {
  const { data } = await api.get<ListResponse | Consultation[]>('/api/consultations', { params });
  if (Array.isArray(data)) return data;
  return (data as ListResponse).data ?? [];
}

/** Undocumented endpoint — falls back to list-then-filter if GET single returns 404/405 */
export async function getConsultation(id: string): Promise<Consultation> {
  try {
    const { data } = await api.get<Consultation>(`/api/consultations/${id}`);
    return data;
  } catch {
    // Fallback: fetch list and find by id
    const list = await getConsultations();
    const found = list.find((c) => c._id === id);
    if (found) return found;
    throw new Error('Consultation not found');
  }
}

export async function respondToConsultation(
  id: string,
  payload: {
    action: 'accept' | 'decline';
    estimateAmount?: number;
    estimateNote?: string;
  },
): Promise<Consultation> {
  const { data } = await api.put<Consultation>(`/api/consultations/${id}/respond`, payload);
  return data;
}

/** Undocumented endpoint — returns [] gracefully if the server returns 404/405 */
export async function getConsultationMessages(id: string): Promise<ConsultationMessage[]> {
  try {
    const { data } = await api.get<ConsultationMessage[] | { messages: ConsultationMessage[] }>(
      `/api/consultations/${id}/messages`,
    );
    return Array.isArray(data) ? data : (data as any).messages ?? [];
  } catch {
    return [];
  }
}

export async function sendConsultationMessage(id: string, body: string): Promise<ConsultationMessage> {
  const { data } = await api.post<ConsultationMessage>(`/api/consultations/${id}/messages`, { body });
  return data;
}
