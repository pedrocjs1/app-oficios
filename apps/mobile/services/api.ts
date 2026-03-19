import { useAuthStore } from '@/stores/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private getToken(): string | null {
    return useAuthStore.getState().token;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error de red' }));
      const err = new Error(error.message || `HTTP ${response.status}`) as any;
      err.statusCode = response.status;
      err.details = error.details;
      throw err;
    }

    // Handle 204 No Content
    if (response.status === 204) return {} as T;

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('POST', '/api/v1/auth/login', { email, password });
  }

  async register(data: any) {
    return this.request<{ user: any; token: string }>('POST', '/api/v1/auth/register', data);
  }

  async registerProfessional(data: any) {
    return this.request<{ user: any; token: string }>('POST', '/api/v1/auth/register-professional', data);
  }

  async getMe() {
    return this.request<{ user: any }>('GET', '/api/v1/auth/me');
  }

  // Categories
  async getCategories() {
    return this.request<any[]>('GET', '/api/v1/categories');
  }

  // Requests
  async createRequest(data: any) {
    return this.request<any>('POST', '/api/v1/requests', data);
  }

  async getRequests(params?: { status?: string; category_id?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category_id) qs.set('category_id', params.category_id);
    const query = qs.toString();
    return this.request<any[]>('GET', `/api/v1/requests${query ? '?' + query : ''}`);
  }

  async getRequest(id: string) {
    return this.request<any>('GET', `/api/v1/requests/${id}`);
  }

  async updateRequest(id: string, data: any) {
    return this.request<any>('PATCH', `/api/v1/requests/${id}`, data);
  }

  async cancelRequest(id: string) {
    return this.request<any>('DELETE', `/api/v1/requests/${id}`);
  }

  // Proposals
  async createProposal(requestId: string, data: any) {
    return this.request<any>('POST', `/api/v1/requests/${requestId}/proposals`, data);
  }

  async getProposals(requestId: string) {
    return this.request<any[]>('GET', `/api/v1/requests/${requestId}/proposals`);
  }

  async acceptProposal(proposalId: string) {
    return this.request<any>('PATCH', `/api/v1/proposals/${proposalId}/accept`);
  }

  async rejectProposal(proposalId: string) {
    return this.request<any>('PATCH', `/api/v1/proposals/${proposalId}/reject`);
  }

  // Jobs
  async getJobs(params?: { status?: string }) {
    const qs = params?.status ? `?status=${params.status}` : '';
    return this.request<any[]>('GET', `/api/v1/jobs${qs}`);
  }

  async getJob(id: string) {
    return this.request<any>('GET', `/api/v1/jobs/${id}`);
  }

  async startJob(id: string) {
    return this.request<any>('PATCH', `/api/v1/jobs/${id}/start`);
  }

  async completeJob(id: string) {
    return this.request<any>('PATCH', `/api/v1/jobs/${id}/complete`);
  }

  async confirmJob(id: string) {
    return this.request<any>('PATCH', `/api/v1/jobs/${id}/confirm`);
  }

  // Messages
  async getMessages(jobId: string) {
    return this.request<any[]>('GET', `/api/v1/jobs/${jobId}/messages`);
  }

  async sendMessage(jobId: string, content: string) {
    return this.request<any>('POST', `/api/v1/jobs/${jobId}/messages`, { content });
  }

  // Reviews
  async createReview(jobId: string, data: { rating: number; comment?: string }) {
    return this.request<any>('POST', `/api/v1/jobs/${jobId}/review`, data);
  }

  // Earnings
  async getEarnings() {
    return this.request<any>('GET', '/api/v1/earnings');
  }

  // Profile
  async getProfile() {
    return this.request<any>('GET', '/api/v1/profile');
  }

  async updateProfile(data: { name?: string; phone?: string; avatar_url?: string; bio?: string }) {
    return this.request<any>('PATCH', '/api/v1/profile', data);
  }

  // Upload
  async upload(base64: string, bucket: string, path: string, contentType?: string) {
    return this.request<{ url: string }>('POST', '/api/v1/upload', { base64, bucket, path, contentType });
  }

  // Admin
  async getAdminDashboard() {
    return this.request<any>('GET', '/api/v1/admin/dashboard');
  }

  async getAdminProfessionals(filter?: string) {
    const qs = filter ? `?filter=${filter}` : '';
    return this.request<any[]>('GET', `/api/v1/admin/professionals${qs}`);
  }

  async approveProfessional(id: string, categoryIds: string[]) {
    return this.request<any>('PATCH', `/api/v1/admin/professionals/${id}/approve`, { category_ids: categoryIds });
  }

  async rejectProfessional(id: string) {
    return this.request<any>('PATCH', `/api/v1/admin/professionals/${id}/reject`);
  }

  async getAdminUsers(params?: { role?: string; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.role && params.role !== 'all') qs.set('role', params.role);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString();
    return this.request<any[]>('GET', `/api/v1/admin/users${query ? '?' + query : ''}`);
  }

  async getAdminRequests(filter?: string) {
    const qs = filter ? `?filter=${filter}` : '';
    return this.request<any[]>('GET', `/api/v1/admin/requests${qs}`);
  }
}

export const api = new ApiClient();
