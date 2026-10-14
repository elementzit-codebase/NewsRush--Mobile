import { get, post, put, patch, del } from './client';
import { ENDPOINTS } from '../constants/api';
import {
  Edition, EditionSummary, CreateEditionRequest, EditionStatus,
  SaveSectionRequest, ValidationResponse, Section
} from '../types';
import { generateHeadline, expandContent } from './ai';

const MAX_PAGE_SIZE = 100;

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const sep = endpoint.includes('?') ? '&' : '?';
  const res = await get<any>(`${endpoint}${sep}page=1&page_size=${MAX_PAGE_SIZE}`);
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) {
    const items: T[] = [...res.items];
    const totalPages = res.total_pages || 1;
    for (let p = 2; p <= totalPages; p++) {
      const next = await get<any>(`${endpoint}${sep}page=${p}&page_size=${MAX_PAGE_SIZE}`);
      if (next && Array.isArray(next.items)) {
        items.push(...next.items);
      }
    }
    return items;
  }
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export const getEditions = async (): Promise<EditionSummary[]> => {
  return fetchAllPages<EditionSummary>(ENDPOINTS.editions.list);
};

export const createEdition = (data: CreateEditionRequest): Promise<Edition> => {
  const payload = {
    newspaper_name: data.newspaper_name || data.title || 'NewsRush',
    date: data.date,
    edition_label: data.edition_label || 'Morning Edition',
    status: data.status || 'draft',
  };
  return post<Edition>(ENDPOINTS.editions.create, payload);
};

export const getEdition = (id: string | number): Promise<Edition> =>
  get<Edition>(ENDPOINTS.editions.get(id));

export const updateEdition = (id: string | number, changes: Partial<Edition>): Promise<Edition> =>
  patch<Edition>(ENDPOINTS.editions.update(id), changes);

export const updateEditionStatus = (id: string | number, status: EditionStatus): Promise<Edition> =>
  patch<Edition>(ENDPOINTS.editions.update(id), { status });

export const deleteEdition = (id: string | number): Promise<void> =>
  del<void>(ENDPOINTS.editions.delete(id));

export const validateEdition = async (id: string | number): Promise<ValidationResponse> => {
  const res = await get<ValidationResponse>(ENDPOINTS.editions.validate(id));
  const issues = (res.incomplete_sections || []).map(
    s => `Page ${s.page_number}: ${s.section_name || s.section_key}`
  );
  return {
    ...res,
    passed: res.all_completed,
    issues,
  };
};

export const listSections = async (editionId: string | number): Promise<Section[]> => {
  return fetchAllPages<Section>(ENDPOINTS.sections.list(editionId));
};

export const saveSection = (
  editionId: string | number,
  section: SaveSectionRequest
): Promise<Section> =>
  put<Section>(ENDPOINTS.sections.save(editionId, section.section_key), section);

// Aliases for compatibility
export const checkReadiness = validateEdition;
export { generateHeadline, expandContent };

export const generateAiHeadline = async (
  _editionId?: any, _pageId?: any, _sectionId?: any, content: string = ''
): Promise<{ headline: string }> => {
  const res = await generateHeadline({ content });
  return { headline: res.headline };
};

export const aiExpandSection = async (
  _editionId?: any, _pageId?: any, _sectionId?: any, summary: string = '', charLimit?: number
): Promise<{ body: string }> => {
  const res = await expandContent({ summary, character_limit: charLimit });
  return { body: res.expanded_content };
};

export const updateSection = async (
  editionId: string | number,
  _pageId: any,
  sectionKeyOrId: string | number,
  data: any
): Promise<void> => {
  const key = String(data.section_key || sectionKeyOrId);
  await saveSection(editionId, {
    page_number: data.page_number || 1,
    section_key: key,
    section_name: data.section_name || key,
    title: data.headline || data.title || null,
    content: data.body || data.content || null,
    status: data.status || 'draft',
  });
};
