// Shared types between frontend and backend

export type Role = "OWNER" | "ADMIN" | "MEMBER";
export type AuditStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
export type BatchStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
export type CheckStatus = "PASS" | "WARN" | "FAIL" | "SKIP";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  members?: WorkspaceMember[];
  projects?: Project[];
}

export interface WorkspaceMember {
  id: string;
  role: Role;
  user: User;
  workspaceId: string;
}

export interface Project {
  id: string;
  name: string;
  domain?: string;
  workspaceId: string;
  _count?: { pages: number; auditBatches: number };
}

export interface ProductPage {
  id: string;
  url: string;
  normalizedUrl: string;
  sku?: string;
  variantGroup?: string;
  projectId: string;
  latestScore?: number;
  audits?: AuditRun[];
}

export interface AuditBatch {
  id: string;
  status: BatchStatus;
  totalUrls: number;
  completed: number;
  failed: number;
  projectId: string;
  runs?: AuditRun[];
  progress?: {
    total: number;
    completed: number;
    failed: number;
    remaining: number;
    percentComplete: number;
  };
}

export interface AuditRun {
  id: string;
  status: AuditStatus;
  pageId: string;
  batchId?: string;
  httpStatus?: number;
  responseTime?: number;
  score?: AuditScore;
  checks?: AuditCheckResult[];
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AuditScore {
  id: string;
  overall: number;
  metadata: number;
  schema: number;
  indexability: number;
  content: number;
  variantRisk: number;
  aiReadiness: number;
}

export interface AuditCheckResult {
  id: string;
  checkId: string;
  category: string;
  status: CheckStatus;
  severity: Severity;
  message: string;
  evidence?: string;
  fixHint?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

export interface BulkImportResult {
  created: number;
  skipped: number;
  errors: string[];
}
