import { api } from './client';

export interface QuoteTemplate {
  _id: string;
  name: string;
  laborCost: number;
  materialsCost: number;
  timeline: string;
  milestones: { title: string; amount: number }[];
  notes: string;
  createdAt: string;
}

export type CreateTemplatePayload = Omit<QuoteTemplate, '_id' | 'createdAt'>;
export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export async function getQuoteTemplates(): Promise<QuoteTemplate[]> {
  const { data } = await api.get<QuoteTemplate[]>('/api/quote-templates');
  return Array.isArray(data) ? data : [];
}

export async function getQuoteTemplate(id: string): Promise<QuoteTemplate> {
  const { data } = await api.get<QuoteTemplate>(`/api/quote-templates/${id}`);
  return data;
}

export async function createQuoteTemplate(payload: CreateTemplatePayload): Promise<QuoteTemplate> {
  const { data } = await api.post<QuoteTemplate>('/api/quote-templates', payload);
  return data;
}

export async function updateQuoteTemplate(
  id: string,
  payload: UpdateTemplatePayload,
): Promise<QuoteTemplate> {
  const { data } = await api.patch<QuoteTemplate>(`/api/quote-templates/${id}`, payload);
  return data;
}

export async function deleteQuoteTemplate(id: string): Promise<void> {
  await api.delete(`/api/quote-templates/${id}`);
}
