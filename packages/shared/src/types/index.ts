export const UserRole = {
  CLIENT: 'client',
  PROFESSIONAL: 'professional',
  BOTH: 'both',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const RequestStatus = {
  OPEN: 'open',
  IN_PROPOSALS: 'in_proposals',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const JobStatus = {
  PENDING_START: 'pending_start',
  IN_PROGRESS: 'in_progress',
  COMPLETED_BY_PROFESSIONAL: 'completed_by_professional',
  CONFIRMED: 'confirmed',
  DISPUTED: 'disputed',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const ProposalStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus];
