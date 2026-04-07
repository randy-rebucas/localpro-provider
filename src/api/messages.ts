import { api } from './client';

export interface Thread {
  id: string;
  jobId: string;
  jobTitle: string;
  otherParty: { id: string; name: string; avatar: string | null };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function getThreads(): Promise<Thread[]> {
  const { data } = await api.get<Thread[]>('/api/messages/threads');
  return data;
}

export async function getMessages(threadId: string): Promise<Message[]> {
  const { data } = await api.get<Message[]>(`/api/messages/${threadId}`);
  return data;
}

export async function sendMessage(threadId: string, body: string): Promise<Message> {
  const { data } = await api.post<Message>(`/api/messages/${threadId}`, { body });
  return data;
}

export async function sendAttachment(threadId: string, fileUri: string): Promise<Message> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: 'attachment.jpg', type: 'image/jpeg' } as any);
  const { data } = await api.post<Message>(`/api/messages/${threadId}/attachment`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
