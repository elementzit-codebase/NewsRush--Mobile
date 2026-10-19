export interface User {
  id: string | number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  phone_number?: string;
  profile_pic?: string | null;
  profilePhoto?: string;
  is_approved?: boolean;
  is_system_user?: boolean;
  role?: 'admin' | 'editor' | 'viewer' | string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  created_at?: string;
  createdAt?: string;
}

export interface Section {
  id?: string | number;
  edition_id?: string;
  page_number: number;
  section_key: string;
  section_name: string;
  title?: string | null;
  content?: string | null;
  status?: 'draft' | 'completed' | string;
  image_url?: string | null;
  image_caption?: string | null;
  photoMode?: 'none' | 'ai' | 'upload';
  // UI aliases
  headline?: string;
  body?: string;
  imageUrl?: string;
  voiceNoteUrl?: string;
  isAiGenerated?: boolean;
}

export interface Page {
  id?: number | string;
  pageNumber: number;
  sections: Section[];
}

export type EditionStatus = 'draft' | 'in_progress' | 'ready' | 'completed';

export interface Edition {
  id: string | number;
  newspaper_name: string;
  date: string;
  edition_label: string;
  language?: string;
  status: EditionStatus;
  created_by_id?: string;
  created_at?: string;
  updated_at?: string;
  sections?: Section[];
  // UI aliases
  title?: string;
  pages?: Page[];
  createdBy?: number | string;
  createdAt?: string;
  updatedAt?: string;
  isReadinessChecked?: boolean;
}

export type EditionSummary = Edition;

export interface IncompleteSectionInfo {
  page_number: number;
  section_key: string;
  section_name: string;
}

export interface ValidationResponse {
  all_completed: boolean;
  incomplete_sections: IncompleteSectionInfo[];
  passed?: boolean;
  issues?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  token?: string;
  user: User;
}

export interface CreateEditionRequest {
  newspaper_name: string;
  date: string;
  edition_label: string;
  language?: string;
  status?: EditionStatus;
  title?: string;
}

export interface SaveSectionRequest {
  page_number: number;
  section_key: string;
  section_name: string;
  title?: string | null;
  content?: string | null;
  status?: string;
  image_url?: string | null;
  image_caption?: string | null;
}

export type AiLanguage = 'english' | 'malayalam';

export interface AiHeadlineRequest {
  content: string;
  language?: AiLanguage;
}

export interface AiHeadlineResponse {
  headline: string;
}

export interface AiExpandRequest {
  summary: string;
  character_limit?: number;
  language?: AiLanguage;
  include_photo?: boolean;
}

export interface AiExpandResponse {
  expanded_content: string;
  generated_title?: string;
  body?: string;
  image_url?: string | null;
  image_caption?: string | null;
}

export interface AiTranscribeRequest {
  audio_b64?: string;
  audio_uri?: string;
  mime_type?: string;
  language?: AiLanguage;
}

export interface AiTranscribeResponse {
  transcript: string;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size?: number;
  total_pages?: number;
  data?: T[];
  perPage?: number;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}
