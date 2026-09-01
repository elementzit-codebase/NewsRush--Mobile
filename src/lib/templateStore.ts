import * as SecureStore from 'expo-secure-store';
import { DEFAULT_TEMPLATE } from '../data/templates';

const memoryStore: Record<string, Record<number, string>> = {};

const keyFor = (editionId: string | number) => `newsrush_tpl_${editionId}`;

export function readTemplates(editionId: string | number): Record<number, string> {
  if (!editionId) return {};
  if (memoryStore[String(editionId)]) {
    return memoryStore[String(editionId)];
  }
  try {
    const raw = SecureStore.getItem(keyFor(editionId));
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryStore[String(editionId)] = parsed;
      return parsed;
    }
  } catch {}
  return {};
}

export function writeTemplate(editionId: string | number, pageNumber: number, templateKey: string): Record<number, string> {
  const current = readTemplates(editionId);
  const next = { ...current, [pageNumber]: templateKey };
  memoryStore[String(editionId)] = next;
  try {
    SecureStore.setItemAsync(keyFor(editionId), JSON.stringify(next));
  } catch {}
  return next;
}

export const templateKeyFor = (selection: Record<number, string>, pageNumber: number): string =>
  selection[pageNumber] || DEFAULT_TEMPLATE;
