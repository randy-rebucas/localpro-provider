import { api } from './client';

export interface SupportMessage {
  _id: string;
  senderId: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

export async function getSupportMessages(): Promise<SupportMessage[]> {
  const { data } = await api.get<SupportMessage[]>('/api/support');
  return Array.isArray(data) ? data : [];
}

export async function sendSupportMessage(body: string): Promise<SupportMessage> {
  const { data } = await api.post<SupportMessage>('/api/support', { body });
  return data;
}
