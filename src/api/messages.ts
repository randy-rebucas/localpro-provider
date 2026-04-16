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
  // REST responses use senderId (string); SSE events may use sender (populated object or string)
  senderId?: string | { _id?: string; id?: string };
  sender?: string | { _id?: string; id?: string };
  body?: string;
  content?: string;  // some backends use content instead of body
  text?: string;
  attachmentUrl?: string | null;
  isRead?: boolean;
  createdAt?: string;
  timestamp?: string | number;  // SSE events sometimes carry a Unix timestamp
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

function extractId(field: string | { _id?: string; id?: string } | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field._id ?? field.id ?? '';
}

function extractTimestamp(raw: RawMessage): string {
  if (raw.createdAt) return raw.createdAt;
  if (raw.timestamp) {
    const ts = Number(raw.timestamp);
    // Unix seconds (< 1e11) vs milliseconds
    return new Date(ts < 1e11 ? ts * 1000 : ts).toISOString();
  }
  return new Date().toISOString();
}

export function normaliseMessage(raw: RawMessage, threadId: string): Message {
  return {
    id: raw._id ?? raw.id ?? String(Math.random()),
    threadId: raw.threadId ?? threadId,
    // Handles both plain-string IDs and populated user objects
    senderId: extractId(raw.senderId) || extractId(raw.sender),
    body: raw.body ?? raw.content ?? raw.text ?? '',
    attachmentUrl: raw.attachmentUrl ?? null,
    isRead: raw.isRead ?? false,
    createdAt: extractTimestamp(raw),
  };
}

export async function getThreads(): Promise<Thread[]> {
  const { data } = await api.get<{ threads: RawThread[] } | RawThread[]>('/api/messages/threads');
  const raw = Array.isArray(data) ? data : ((data as { threads: RawThread[] }).threads ?? []);
  return raw.map(normaliseThread);
}

export async function getMessages(threadId: string): Promise<Message[]> {
  const { data } = await api.get<RawMessage[] | { messages: RawMessage[] }>(`/api/messages/${threadId}`);
  const arr = Array.isArray(data) ? data : ((data as any)?.messages ?? []);
  return arr.map((m: RawMessage) => normaliseMessage(m, threadId));
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
