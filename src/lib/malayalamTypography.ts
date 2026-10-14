/**
 * Malayalam Newspaper Typography & Syllable-Level Line Breaking
 * (Mirrors NewsRush-FE /src/lib/malayalamTypography.js)
 */

const AKSHARA_REGEX =
  /(?:[\u0D7A-\u0D7F][\u0D02\u0D03]?|[\u0D15-\u0D3A]\u0D4D\u200D[\u0D02\u0D03]?|[\u0D05-\u0D14][\u0D02\u0D03]?|[\u0D15-\u0D3A](?:\u0D4D[\u200C\u200D]?[\u0D15-\u0D3A])*(?:[\u0D3E-\u0D4C\u0D57\u0D62\u0D63]\u0D4D?|\u0D4D)?[\u0D02\u0D03]?)/g;

const ZWSP = '\u200B';

export function hasMalayalamText(str?: string | null): boolean {
  return typeof str === 'string' && /[\u0D00-\u0D7F]/.test(str);
}

export function isMalayalamEdition(edition: any): boolean {
  if (!edition) return false;
  const lang = (edition.language || '').toLowerCase();
  if (lang === 'english') return false;
  if (lang === 'malayalam') return true;
  const sections = edition.sections || [];
  return sections.some((s: any) => hasMalayalamText(s.content) || hasMalayalamText(s.title));
}

function splitIntoMalayalamSyllables(coreWord: string): string[] {
  const matches = coreWord.match(AKSHARA_REGEX);
  if (!matches || matches.length === 0) return [coreWord];

  const syllables: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const token = matches[i];
    const isChillu =
      /^[\u0D7A-\u0D7F]/.test(token) || /^[\u0D15-\u0D3A]\u0D4D\u200D/.test(token);
    const isPureViramaCoda = /^[\u0D15-\u0D3A]\u0D4D$/.test(token);

    if ((isChillu || isPureViramaCoda) && syllables.length > 0) {
      syllables[syllables.length - 1] += token;
    } else {
      syllables.push(token);
    }
  }

  return syllables;
}

export function hyphenateMalayalamWord(word: string): string {
  if (!hasMalayalamText(word)) return word;

  const leadMatch = word.match(/^[^\u0D00-\u0D7F]+/);
  const lead = leadMatch ? leadMatch[0] : '';
  const rest = word.slice(lead.length);

  const trailMatch = rest.match(/[^\u0D00-\u0D7F]+$/);
  const trail = trailMatch ? trailMatch[0] : '';
  const core = rest.slice(0, rest.length - trail.length);

  if (!core) return word;

  const syllables = splitIntoMalayalamSyllables(core);

  if (syllables.length <= 2) {
    return word;
  }

  let result = syllables[0] + syllables[1];
  for (let i = 2; i < syllables.length; i++) {
    result += ZWSP + syllables[i];
  }

  return lead + result + trail;
}

export function formatMalayalamNewspaperText(text?: string | null): string {
  if (!text || typeof text !== 'string' || !hasMalayalamText(text)) {
    return text || '';
  }

  const paragraphs = text.split('\n');
  return paragraphs
    .map(para => {
      const tokens = para.split(/(\s+)/);
      return tokens
        .map(token => {
          if (/^\s+$/.test(token)) return token;
          return hyphenateMalayalamWord(token);
        })
        .join('');
    })
    .join('\n');
}

