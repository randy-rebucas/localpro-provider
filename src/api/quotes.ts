import { api } from './client';

export interface Milestone {
  title: string;
  amount: number;
}

export interface Quote {
  _id: string;
  jobId: string;
  jobTitle: string;
  proposedAmount: number;
  laborCost: number;
  materialsCost: number;
  timeline: string;
  notes: string;
  milestones: Milestone[];
  status: string;
  proposalDocUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitQuotePayload {
  jobId: string;
  proposedAmount: number;
  laborCost?: number;
  materialsCost?: number;
  timeline: string;
  notes?: string;
  message?: string;
  milestones?: Milestone[];
}

function normaliseQuote(raw: Record<string, any>): Quote {
  return {
    _id:           raw._id ?? raw.id ?? '',
    jobId:         raw.jobId ?? '',
    jobTitle:      raw.jobTitle ?? raw.job?.title ?? raw.jobId ?? '',
    proposedAmount: raw.proposedAmount ?? raw.amount ?? 0,
    laborCost:     raw.laborCost ?? raw.laborAmount ?? 0,
    materialsCost: raw.materialsCost ?? raw.materialsAmount ?? 0,
    timeline:      raw.timeline ?? '',
    notes:         raw.notes ?? '',
    milestones:    Array.isArray(raw.milestones) ? raw.milestones : [],
    status:        raw.status ?? 'pending',
    proposalDocUrl: raw.proposalDocUrl ?? null,
    createdAt:     raw.createdAt ?? '',
    updatedAt:     raw.updatedAt ?? '',
  };
}

/**
 * GET /api/quotes — handles all backend response shapes:
 *   • Quote[]
 *   • { quotes: Quote[] }
 *   • { quotedJobIds: string[] }  ← backend may return only IDs; we fetch each quote individually
 */
export async function getMyQuotes(): Promise<Quote[]> {
  const { data } = await api.get<any>('/api/quotes');

  // Shape 1: plain array of quote objects
  if (Array.isArray(data)) return data.map(normaliseQuote);

  // Shape 2: { quotes: [...] }
  if (Array.isArray(data?.quotes)) return data.quotes.map(normaliseQuote);

  // Shape 3: { quotedJobIds: [...] } — fetch each quote by its job/quote ID
  const ids: string[] = Array.isArray(data?.quotedJobIds) ? data.quotedJobIds : [];
  if (ids.length === 0) return [];

  const results = await Promise.allSettled(ids.map((id) => getQuote(id)));
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/** Returns job IDs this provider has quoted — used by dashboard badge count. */
export async function getQuotedJobIds(): Promise<string[]> {
  const { data } = await api.get<any>('/api/quotes');
  if (Array.isArray(data)) return data.map((q: any) => q.jobId ?? '').filter(Boolean);
  if (Array.isArray(data?.quotes)) return data.quotes.map((q: any) => q.jobId ?? '').filter(Boolean);
  if (Array.isArray(data?.quotedJobIds)) return data.quotedJobIds;
  return [];
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await api.get<Record<string, any>>(`/api/quotes/${id}`);
  // Handle both flat quote object and wrapped { quote: { ... } }
  const raw = data?.quote ?? data;
  return normaliseQuote(raw);
}

export async function submitQuote(payload: SubmitQuotePayload): Promise<Quote> {
  const { data } = await api.post<Record<string, any>>('/api/quotes', payload);
  return normaliseQuote(data);
}

export async function updateQuote(id: string, payload: Partial<SubmitQuotePayload>): Promise<Quote> {
  const { data } = await api.put<Record<string, any>>(`/api/quotes/${id}`, payload);
  return normaliseQuote(data);
}

export async function retractQuote(id: string): Promise<void> {
  await api.delete(`/api/quotes/${id}`);
}

export async function uploadQuoteDocument(
  quoteId: string,
  fileUri: string,
  fileName: string,
): Promise<void> {
  const form = new FormData();
  form.append('document', { uri: fileUri, name: fileName, type: 'application/pdf' } as any);
  await api.post(`/api/quotes/${quoteId}/document`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
