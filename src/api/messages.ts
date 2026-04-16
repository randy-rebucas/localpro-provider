import { api } from './client';

interface RawThread {
  threadId: string;
  jobTitle: string;
  lastMessage: { body: string; createdAt: string } | string | null;
  unreadCount: number;
  otherParty: { _id?: string; id?: string; name: string; avatar?: string | null };
}

interface RawMessage {
  _id?: string;
  id?: string;
  threadId?: string;
  senderId: string;
  body: string;
  attachmentUrl?: string | null;
  isRead?: boolean;
  createdAt: string;
}

export interface Thread {
  id: string;          // = threadId (which equals jobId for job threads)
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

function normaliseThread(raw: RawThread): Thread {
  const lm = raw.lastMessage;
  return {
    id: raw.threadId,
    jobTitle: raw.jobTitle ?? '',
    otherParty: {
      id: raw.otherParty?._id ?? raw.otherParty?.id ?? '',
      name: raw.otherParty?.name ?? '',
      avatar: raw.otherParty?.avatar ?? null,
    },
    lastMessage: typeof lm === 'string' ? lm : (lm?.body ?? ''),
    lastMessageAt: typeof lm === 'object' && lm !== null ? (lm.createdAt ?? '') : '',
    unreadCount: raw.unreadCount ?? 0,
  };
}

export function normaliseMessage(raw: RawMessage, threadId: string): Message {
  return {
    id: raw._id ?? raw.id ?? String(Math.random()),
    threadId: raw.threadId ?? threadId,
    senderId: raw.senderId ?? '',
    body: raw.body ?? '',
    attachmentUrl: raw.attachmentUrl ?? null,
    isRead: raw.isRead ?? false,
    createdAt: raw.createdAt ?? '',
  };
}

export async function getThreads(): Promise<Thread[]> {
  const { data } = await api.get<{ threads: RawThread[] } | RawThread[]>('/api/messages/threads');
  const raw = Array.isArray(data) ? data : ((data as { threads: RawThread[] }).threads ?? []);
  return raw.map(normaliseThread);
}

export async function getMessages(threadId: string): Promise<Message[]> {
  const { data } = await api.get<RawMessage[]>(`/api/messages/${threadId}`);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((m) => normaliseMessage(m, threadId));
}

export async function sendMessage(threadId: string, body: string): Promise<Message> {
  const { data } = await api.post<RawMessage>(`/api/messages/${threadId}`, { body });
  return normaliseMessage(data, threadId);
}

export async function sendAttachment(threadId: string, fileUri: string): Promise<Message> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: 'attachment.jpg', type: 'image/jpeg' } as any);
  const { data } = await api.post<RawMessage>(`/api/messages/${threadId}/attachment`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return normaliseMessage(data, threadId);
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ unreadCount: number }>('/api/messages');
  return data.unreadCount ?? 0;
}
