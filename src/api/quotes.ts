import { api } from './client';

export interface Milestone {
  title: string;
  amount: number;
}

export interface Quote {
  id: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  laborAmount: number;
  materialsAmount: number;
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
  amount: number;
  laborAmount?: number;
  materialsAmount?: number;
  timeline: string;
  notes?: string;
  milestones?: Milestone[];
}

export async function getMyQuotes(): Promise<Quote[]> {
  const { data } = await api.get<Quote[]>('/api/quotes/mine');
  return data;
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await api.get<Quote>(`/api/quotes/${id}`);
  return data;
}

export async function submitQuote(payload: SubmitQuotePayload): Promise<Quote> {
  const { data } = await api.post<Quote>('/api/quotes', payload);
  return data;
}

export async function updateQuote(id: string, payload: Partial<SubmitQuotePayload>): Promise<Quote> {
  const { data } = await api.put<Quote>(`/api/quotes/${id}`, payload);
  return data;
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
