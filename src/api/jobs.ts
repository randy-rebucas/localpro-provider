import { api } from './client';

export interface Job {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  location: string;
  status: string;
  escrowStatus: string;
  isPriority: boolean;
  jobTags: string[];
  jobSource: string;
  beforePhoto: string[];
  afterPhoto: string[];
  milestones: { title: string; amount: number; status?: string }[];
  scheduleDate: string | null;
  specialInstructions: string | null;
  clientId: string | null;
  providerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobsFilters {
  status?: string;
  category?: string;
  location?: string;
  minBudget?: number;
  maxBudget?: number;
  aiRank?: boolean;
  page?: number;
  limit?: number;
}

export async function getJobs(filters: JobsFilters = {}): Promise<Job[]> {
  const { data } = await api.get<JobsResponse | Job[]>('/api/jobs', { params: filters });
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as JobsResponse).data)) return (data as JobsResponse).data;
  return [];
}

export async function getJob(id: string): Promise<Job> {
  const { data } = await api.get<Job>(`/api/jobs/${id}`);
  return data;
}

export async function getMyJobs(filters: JobsFilters = {}): Promise<Job[]> {
  const { data } = await api.get<JobsResponse | Job[]>('/api/jobs/mine', { params: filters });
  // Handle both wrapped { data: [] } and plain [] responses
  return Array.isArray(data) ? data : (data as JobsResponse).data ?? [];
}

/** Returns the total count for a given status without fetching all records */
export async function getMyJobsCount(status: string): Promise<number> {
  const { data } = await api.get<JobsResponse | Job[]>('/api/jobs/mine', {
    params: { status, limit: 1 },
  });
  if (Array.isArray(data)) return data.length;
  return (data as JobsResponse).total ?? 0;
}

export async function withdrawFromJob(id: string, reason: string): Promise<void> {
  await api.post(`/api/jobs/${id}/withdraw`, { reason });
}

export async function uploadCompletionPhoto(
  id: string,
  photoUri: string,
  caption?: string,
): Promise<void> {
  const form = new FormData();
  form.append('photo', { uri: photoUri, name: 'completion.jpg', type: 'image/jpeg' } as any);
  if (caption) form.append('caption', caption);
  await api.patch(`/api/jobs/${id}/completion-photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
