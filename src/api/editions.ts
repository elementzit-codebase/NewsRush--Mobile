import { get, post, put, patch, del, postForm } from './client';
import { ENDPOINTS } from '../constants/api';
import { Edition, EditionSummary, CreateEditionRequest, EditionStatus, UpdateSectionRequest } from '../types';

export const getEditions = (): Promise<EditionSummary[]> =>
  get<EditionSummary[]>(ENDPOINTS.editions.list);

export const createEdition = (data: CreateEditionRequest): Promise<Edition> =>
  post<Edition>(ENDPOINTS.editions.create, data);

export const getEdition = (id: number): Promise<Edition> =>
  get<Edition>(ENDPOINTS.editions.get(id));

export const deleteEdition = (id: number): Promise<void> =>
  del<void>(ENDPOINTS.editions.delete(id));

export const updateEditionStatus = (id: number, status: EditionStatus): Promise<Edition> =>
  patch<Edition>(ENDPOINTS.editions.updateStatus(id), { status });

export const checkReadiness = (id: number): Promise<{ passed: boolean; issues: string[] }> =>
  get<{ passed: boolean; issues: string[] }>(ENDPOINTS.editions.checkReadiness(id));

export const updateSection = (
  editionId: number, pageId: number, sectionId: number,
  data: UpdateSectionRequest
): Promise<void> =>
  put<void>(ENDPOINTS.sections.update(editionId, pageId, sectionId), data);

export const generateAiHeadline = (
  editionId: number, pageId: number, sectionId: number
): Promise<{ headline: string }> =>
  post<{ headline: string }>(ENDPOINTS.sections.aiHeadline(editionId, pageId, sectionId));

export const aiExpandSection = (
  editionId: number, pageId: number, sectionId: number
): Promise<{ body: string }> =>
  post<{ body: string }>(ENDPOINTS.sections.aiExpand(editionId, pageId, sectionId));

export const uploadSectionImage = (
  editionId: number, pageId: number, sectionId: number, formData: FormData
): Promise<{ imageUrl: string }> =>
  postForm<{ imageUrl: string }>(ENDPOINTS.sections.uploadImage(editionId, pageId, sectionId), formData);
