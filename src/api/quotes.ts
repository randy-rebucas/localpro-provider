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
 * GET /api/quotes → { quotedJobIds: [] }
 * Returns the job IDs this provider has submitted quotes for.
 * There is no "list all my quotes" endpoint; this is the closest equivalent.
 */
export async function getQuotedJobIds(): Promise<string[]> {
  const { data } = await api.get<{ quotedJobIds: string[] }>('/api/quotes');
  return Array.isArray(data.quotedJobIds) ? data.quotedJobIds : [];
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await api.get<Record<string, any>>(`/api/quotes/${id}`);
  return normaliseQuote(data);
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
