/**
 * Text capacity and boundary utilities for NewsRush Mobile print and editor geometry.
 */

const SENTENCE_END = /[.!?…\u0964\u0965]+(?:["'’”)]*)?(?=\s|$)/gu;

/** End offsets for complete English or Malayalam sentences. */
export function sentenceEndOffsets(text: string, language: string = 'malayalam'): number[] {
  if (typeof text !== 'string' || !text) return [];
  if (typeof (Intl as any)?.Segmenter === 'function') {
    try {
      const locale = language === 'malayalam' ? 'ml' : 'en';
      const segmenter = new (Intl as any).Segmenter(locale, { granularity: 'sentence' });
      const offsets: number[] = [];
      let cursor = 0;
      for (const part of segmenter.segment(text)) {
        const trimmed = part.segment.trimEnd();
        const end = cursor + trimmed.length;
        if (/[.!?…\u0964\u0965]+(?:["'’”)]*)$/.test(trimmed)) offsets.push(end);
        cursor += part.segment.length;
      }
      if (offsets.length) return offsets;
    } catch {
      // Fall back to regex
    }
  }
  return [...text.matchAll(SENTENCE_END)].map(match => (match.index || 0) + match[0].length);
}

/** Keeps the longest complete-sentence prefix within a character capacity. */
export function truncateAtSentenceBoundary(text: string, limit: number, language: string = 'malayalam'): string {
  if (typeof text !== 'string' || text.length <= limit) return text ?? '';
  const end = sentenceEndOffsets(text, language).filter(offset => offset <= limit).at(-1);
  return end ? text.slice(0, end).trimEnd() : '';
}

/**
 * Standard ratios for photo layout capacity reductions when an image is attached.
 */
export const PHOTO_CAPACITY_RATIOS = {
  firstNews: {
    3: 0.88,
    2: 0.84,
    1: 0.78,
  } as Record<number, number>,
  otherNews: {
    3: 0.96,
    2: 0.92,
    1: 0.86,
  } as Record<number, number>,
};

/**
 * Returns effective character limit accounting for whether an active photo is attached.
 */
export function effectiveCapacityFor({
  baseCapacity,
  span = 2,
  isFirstSection = false,
  hasPhoto = false,
}: {
  baseCapacity: number;
  span?: number;
  isFirstSection?: boolean;
  hasPhoto?: boolean;
}): number {
  if (!hasPhoto) return baseCapacity;
  const ratioMap = isFirstSection ? PHOTO_CAPACITY_RATIOS.firstNews : PHOTO_CAPACITY_RATIOS.otherNews;
  const ratio = ratioMap[span] ?? 0.85;
  return Math.round(baseCapacity * ratio);
}

/**
 * Splits text for the lead section layout where a photo occupies the right 2 columns.
 * Left text fills the first columns (full height); right text flows underneath the photo.
 */
export function splitLeadStoryText(
  text: string,
  span: number = 3,
  leftRatio: number | null = null,
  leftCharLimit: number | null = null,
  language: string = 'malayalam'
): { leftText: string; rightText: string } {
  if (!text || typeof text !== 'string') {
    return { leftText: '', rightText: '' };
  }

  const trimmed = text.trim();
  if (
    trimmed.length < 150 &&
    (!Number.isFinite(leftCharLimit) || (leftCharLimit !== null && trimmed.length <= leftCharLimit))
  ) {
    return { leftText: trimmed, rightText: '' };
  }

  const defaultRatios: Record<number, number> = { 3: 0.78, 2: 0.50, 1: 0.68 };
  const ratio = leftRatio ?? defaultRatios[span] ?? 0.74;

  if (Number.isFinite(leftCharLimit) && leftCharLimit !== null && leftCharLimit > 0) {
    const sentenceEnds = sentenceEndOffsets(trimmed, language);
    const limit = Math.max(0, Math.min(trimmed.length, leftCharLimit));
    let splitIndex = sentenceEnds.filter(offset => offset <= limit).at(-1);

    if (!splitIndex) {
      const beforeLimit = [...trimmed.slice(0, limit).matchAll(/\s/gu)].at(-1);
      if (beforeLimit) {
        splitIndex = (beforeLimit.index || 0) + beforeLimit[0].length;
      } else {
        const afterLimit = trimmed.slice(limit).match(/\s/u);
        if (afterLimit) {
          splitIndex = limit + (afterLimit.index || 0) + afterLimit[0].length;
        }
      }
    }

    if (splitIndex) {
      return {
        leftText: trimmed.slice(0, splitIndex).trimEnd(),
        rightText: trimmed.slice(splitIndex).trimStart(),
      };
    }
  }

  const targetLength = Math.round(trimmed.length * ratio);

  // 1. Check for paragraph break near target
  const pRange = 120;
  const searchStartP = Math.max(0, targetLength - pRange);
  const searchEndP = Math.min(trimmed.length, targetLength + pRange);
  const pMatch = trimmed.slice(searchStartP, searchEndP).lastIndexOf('\n\n');
  if (pMatch !== -1) {
    const splitIndex = searchStartP + pMatch + 2;
    return {
      leftText: trimmed.slice(0, splitIndex).trim(),
      rightText: trimmed.slice(splitIndex).trim(),
    };
  }

  // 2. Check for single newline
  const nMatch = trimmed.slice(searchStartP, searchEndP).lastIndexOf('\n');
  if (nMatch !== -1) {
    const splitIndex = searchStartP + nMatch + 1;
    return {
      leftText: trimmed.slice(0, splitIndex).trim(),
      rightText: trimmed.slice(splitIndex).trim(),
    };
  }

  // 3. Prefer a complete sentence boundary near target
  const sRange = 70;
  const searchStartS = Math.max(0, targetLength - sRange);
  const searchEndS = Math.min(trimmed.length, targetLength + sRange);
  const sub = trimmed.slice(searchStartS, searchEndS);
  let bestIdx = -1;
  for (const match of sub.matchAll(SENTENCE_END)) {
    if ((match.index || 0) > bestIdx) bestIdx = (match.index || 0) + match[0].length;
  }
  if (bestIdx !== -1) {
    const splitIndex = searchStartS + bestIdx;
    return {
      leftText: trimmed.slice(0, splitIndex).trim(),
      rightText: trimmed.slice(splitIndex).trim(),
    };
  }

  // 4. Fall back to word boundary
  const wRange = 40;
  const searchStartW = Math.max(0, targetLength - wRange);
  const searchEndW = Math.min(trimmed.length, targetLength + wRange);
  const wMatch = trimmed.slice(searchStartW, searchEndW).lastIndexOf(' ');
  if (wMatch !== -1) {
    const splitIndex = searchStartW + wMatch + 1;
    return {
      leftText: trimmed.slice(0, splitIndex).trim(),
      rightText: trimmed.slice(splitIndex).trim(),
    };
  }

  return {
    leftText: trimmed.slice(0, targetLength).trim(),
    rightText: trimmed.slice(targetLength).trim(),
  };
}

