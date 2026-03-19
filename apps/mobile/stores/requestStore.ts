import { create } from 'zustand';

type ServiceRequest = {
  id: string;
  category_id: string;
  problem_type: string;
  description: string | null;
  photos: string[];
  urgency: 'normal' | 'urgent' | 'emergency';
  status: string;
  proposals_count: number;
  max_proposals: number;
  created_at: string;
  expires_at: string;
  categories?: { name: string } | null;
};

type RequestState = {
  activeRequests: ServiceRequest[];
  selectedRequest: ServiceRequest | null;
  setActiveRequests: (requests: ServiceRequest[]) => void;
  setSelectedRequest: (request: ServiceRequest | null) => void;
  addRequest: (request: ServiceRequest) => void;
  updateRequest: (id: string, updates: Partial<ServiceRequest>) => void;
};

export const useRequestStore = create<RequestState>((set) => ({
  activeRequests: [],
  selectedRequest: null,
  setActiveRequests: (activeRequests) => set({ activeRequests }),
  setSelectedRequest: (selectedRequest) => set({ selectedRequest }),
  addRequest: (request) =>
    set((state) => ({ activeRequests: [request, ...state.activeRequests] })),
  updateRequest: (id, updates) =>
    set((state) => ({
      activeRequests: state.activeRequests.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),
}));
