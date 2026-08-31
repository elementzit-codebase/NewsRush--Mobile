export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'approved' | 'rejected';
  profilePhoto?: string;
  createdAt: string;
}

export interface Section {
  id: number;
  position: number;
  headline: string;
  body: string;
  imageUrl?: string;
  voiceNoteUrl?: string;
  sectionType: 'text' | 'image' | 'mixed';
  isAiGenerated?: boolean;
}

export interface Page {
  id: number;
  pageNumber: number;
  sections: Section[];
}

export interface Edition {
  id: number;
  title: string;
  date: string;
  status: 'draft' | 'in_progress' | 'ready' | 'completed';
  pages: Page[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isReadinessChecked?: boolean;
}

export interface EditionSummary {
  id: number;
  title: string;
  date: string;
  status: 'draft' | 'in_progress' | 'ready' | 'completed';
  createdAt: string;
  updatedAt: string;
  pageCount?: number;
  sectionCount?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export type EditionStatus = 'draft' | 'in_progress' | 'ready' | 'completed';

export interface CreateEditionRequest {
  title: string;
  date: string;
}

export interface UpdateSectionRequest {
  headline?: string;
  body?: string;
  imageUrl?: string;
}

export interface UserApprovalRequest {
  userId: number;
  action: 'approve' | 'reject';
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  profilePhoto?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}
