// Validators
export { loginSchema, registerSchema, registerProfessionalSchema } from './validators/auth.js';
export type { LoginInput, RegisterInput, RegisterProfessionalInput } from './validators/auth.js';

export { createRequestSchema, updateRequestSchema } from './validators/requests.js';
export type { CreateRequestInput, UpdateRequestInput } from './validators/requests.js';

export { createProposalSchema } from './validators/proposals.js';
export type { CreateProposalInput } from './validators/proposals.js';

// Types
export { UserRole, RequestStatus, JobStatus, ProposalStatus } from './types/index.js';
export type {
  UserRole as UserRoleType,
  RequestStatus as RequestStatusType,
  JobStatus as JobStatusType,
  ProposalStatus as ProposalStatusType,
} from './types/index.js';
