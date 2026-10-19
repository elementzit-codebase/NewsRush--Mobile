import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from '../components/CustomAlert';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Share2,
  Check,
  AlertTriangle,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { SERVER_ORIGIN } from '../constants/api';
import { Edition, Section } from '../types';
import { getEdition, listSections, updateEditionStatus } from '../api/editions';
import { buildPage, DEFAULT_TEMPLATE } from '../data/templates';
import { readTemplates } from '../lib/templateStore';
import { formatMalayalamNewspaperText, isMalayalamEdition } from '../lib/malayalamTypography';
import { cleanSectionContent, cleanSectionTitle } from '../lib/contentSanitizer';
import { splitLeadStoryText, effectiveCapacityFor } from '../lib/capacity';
import { RootStackParamList } from '../navigation';

type Route = RouteProp<RootStackParamList, 'PrintEdition'>;

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

function splitTextIntoColumns(text: string, count: number): string[] {
  if (count <= 1) return [text];
  const trimmed = text.trim();
  if (!trimmed) {
    return Array(count).fill('');
  }
  const words = trimmed.split(/\s+/);
  if (words.length === 0) {
    return Array(count).fill('');
  }

  const totalWords = words.length;
  const wordsPerCol = Math.ceil(totalWords / count);

  const cols: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * wordsPerCol;
    const end = Math.min(start + wordsPerCol, totalWords);
    if (start < totalWords) {
      cols.push(words.slice(start, end).join(' '));
    } else {
      cols.push('');
    }
  }

  return cols;
}

function slicedCharHtml(char: string): string {
  const cuts = ['30%', '54%', '78%'];
  const cutsHtml = cuts
    .map(
      left =>
        `<span style="position: absolute; top: -0.6em; bottom: -0.6em; width: 0.055em; background: #ffffff; left: ${left}; transform: rotate(45deg);"></span>`
    )
    .join('');
  return `<span style="position: relative; display: inline-block; font-style: normal;">${char}<span style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none;">${cutsHtml}</span></span>`;
}

function logoWordHtml(word: string): string {
  return [...word]
    .map((char, i) => (i > 0 && char === 'R' ? slicedCharHtml(char) : char))
    .join('');
}

function mastheadHtml(name: string): string {
  const words = (name || 'NewsRush Daily').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const last = words.length - 1;
  return words
    .map((word, i) => {
      const rendered = logoWordHtml(word);
      if (words.length > 1 && i === last) {
        return `<span class="title-daily">${rendered}</span>`;
      }
      return rendered;
    })
    .join(' ');
}

const formatLongDate = (iso?: string) => {
  const date = iso ? new Date(`${iso}T00:00:00`) : new Date();
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const PAGE_NAMES = [
  'Page 1 · Front Page',
  'Page 2 · Kerala & District',
  'Page 3 · Sports & Business',
  'Page 4 · Features & Evening',
];

function SlicedLetter({ char, isLarge }: { char: string; isLarge: boolean }) {
  const cuts = ['30%', '54%', '78%'];
  return (
    <View style={styles.slicedCharContainer}>
      <Text style={isLarge ? styles.mastheadTitleMain : styles.mastheadInnerTitleMain}>
        {char}
      </Text>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.slicedCutOverflow}>
          {cuts.map((leftPercent, i) => (
            <View
              key={i}
              style={[
                styles.sliceCutBar,
                { left: leftPercent as any },
                isLarge ? styles.sliceCutBarLarge : styles.sliceCutBarSmall,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function renderWordParts(word: string, isLarge: boolean, wordIdx: number) {
  const parts: React.ReactNode[] = [];
  let current = '';

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (i > 0 && char === 'R') {
      if (current) {
        parts.push(
          <Text
            key={`w${wordIdx}-t${i}`}
            style={isLarge ? styles.mastheadTitleMain : styles.mastheadInnerTitleMain}
          >
            {current}
          </Text>
        );
        current = '';
      }
      parts.push(
        <SlicedLetter key={`w${wordIdx}-r${i}`} char="R" isLarge={isLarge} />
      );
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(
      <Text
        key={`w${wordIdx}-end`}
        style={isLarge ? styles.mastheadTitleMain : styles.mastheadInnerTitleMain}
      >
        {current}
      </Text>
    );
  }

  return parts;
}

const renderMastheadTitle = (name?: string, isLarge = true) => {
  const words = (name || 'NewsRush Daily').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const lastIdx = words.length - 1;

  return (
    <View style={isLarge ? styles.mastheadTitleRow : styles.mastheadInnerTitleRow}>
      {words.map((word, i) => {
        const isLastWord = words.length > 1 && i === lastIdx;
        if (isLastWord) {
          return (
            <Text
              key={i}
              style={isLarge ? styles.mastheadTitleItalic : styles.mastheadInnerTitleItalic}
            >
              {' '}{word}
            </Text>
          );
        }
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <Text style={isLarge ? styles.mastheadTitleMain : styles.mastheadInnerTitleMain}>
                {' '}
              </Text>
            )}
            {renderWordParts(word, isLarge, i)}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${SERVER_ORIGIN}${trimmed}`;
  }
  return trimmed;
}

async function resolveImageAsBase64(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl) return null;
  const normalized = normalizeImageUrl(imageUrl);
  if (!normalized) return null;
  if (normalized.startsWith('data:image/')) return normalized;

  try {
    if (normalized.startsWith('file://')) {
      const b64 = await FileSystem.readAsStringAsync(normalized, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const ext = normalized.split('.').pop()?.toLowerCase() || 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${b64}`;
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      const ext = normalized.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
      const cleanExt = ['png', 'webp', 'jpeg', 'jpg'].includes(ext) ? ext : 'jpg';
      const localUri = `${FileSystem.cacheDirectory}print_img_${Date.now()}_${Math.random().toString(36).slice(2)}.${cleanExt}`;

      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      };

      try {
        const downloadResult = await FileSystem.downloadAsync(normalized, localUri, { headers });
        if (downloadResult?.status === 200) {
          const b64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mime = cleanExt === 'png' ? 'image/png' : cleanExt === 'webp' ? 'image/webp' : 'image/jpeg';
          return `data:${mime};base64,${b64}`;
        }
      } catch {
        // Fallback to fetch
      }

      try {
        const res = await fetch(normalized, { headers });
        if (res.ok) {
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') resolve(reader.result);
              else reject(new Error('Failed reading blob'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (dataUrl && dataUrl.startsWith('data:image/')) {
            return dataUrl;
          }
        }
      } catch (fetchErr) {
        console.warn('Fetch fallback failed for image:', fetchErr);
      }
    }
  } catch (err) {
    console.warn('Failed to convert image to base64 for print:', err);
  }

  return normalized;
}

async function resolveAllSectionImages(sections: any[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const s of sections) {
    if (s?.image_url && s.section_key) {
      const resolved = await resolveImageAsBase64(s.image_url);
      if (resolved) {
        map.set(s.section_key, resolved);
      }
    }
  }
  return map;
}

export default function PrintEditionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { editionId } = route.params;
  const [edition, setEdition] = useState<Edition | null>(null);
  const [resolvedImagesMap, setResolvedImagesMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [activeSheet, setActiveSheet] = useState(0);
  const [templateSelection, setTemplateSelection] = useState<Record<number, string>>(() =>
    readTemplates(editionId)
  );

  const flatListRef = useRef<FlatList>(null);
  const { width: windowWidth } = useWindowDimensions();

  const goToPage = (index: number) => {
    if (index < 0 || index >= 4) return;
    setActiveSheet(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const load = async () => {
    try {
      const [editionData, sectionsList] = await Promise.all([
        getEdition(editionId),
        listSections(editionId).catch(() => []),
      ]);
      const sectionsMap = new Map<string, Section>();
      (editionData?.sections || []).forEach((s: any) => {
        if (s?.section_key) sectionsMap.set(s.section_key, s);
      });
      (sectionsList || []).forEach((s: any) => {
        if (s?.section_key) {
          const prev: any = sectionsMap.get(s.section_key) || {};
          sectionsMap.set(s.section_key, {
            ...prev,
            ...s,
            image_url: s.image_url || prev.image_url || null,
            image_caption: s.image_caption || prev.image_caption || null,
          });
        }
      });
      const mergedSections = Array.from(sectionsMap.values());
      const completeEdition = { ...editionData, sections: mergedSections };
      setEdition(completeEdition);
      setTemplateSelection(readTemplates(editionId));

      // Resolve images in background for instant preview & PDF export
      resolveAllSectionImages(mergedSections)
        .then(resMap => setResolvedImagesMap(resMap))
        .catch(err => console.warn('Pre-resolving images warning:', err));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load edition');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [editionId]);

  const handleMarkCompleted = async () => {
    setCompleting(true);
    try {
      const updated = await updateEditionStatus(editionId, 'completed');
      setEdition(prev => (prev ? { ...prev, status: updated.status } : updated));
      Alert.alert('Status Updated', 'Edition is archived as Completed.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    } finally {
      setCompleting(false);
    }
  };

  const currentSheetNumber = activeSheet + 1;
  const currentTplKey = templateSelection[currentSheetNumber] || DEFAULT_TEMPLATE;
  const currentBuiltPage = useMemo(
    () => buildPage(currentSheetNumber, currentTplKey),
    [currentSheetNumber, currentTplKey]
  );

  const savedSectionsMap = useMemo(() => {
    const map = new Map<string, any>();
    (edition?.sections || []).forEach(s => {
      if (s.section_key) map.set(s.section_key, s);
    });
    return map;
  }, [edition]);

  const missingCount = useMemo(() => {
    const allBlocks = [1, 2, 3, 4].flatMap(
      pNum => buildPage(pNum, templateSelection[pNum] || DEFAULT_TEMPLATE).blocks
    );
    return allBlocks.filter(b => {
      const sec = savedSectionsMap.get(b.section_key);
      return !(sec?.title && sec?.content && sec.status === 'completed');
    }).length;
  }, [templateSelection, savedSectionsMap]);

  const thinSections = useMemo(() => {
    const allBlocks = [1, 2, 3, 4].flatMap(
      pNum => buildPage(pNum, templateSelection[pNum] || DEFAULT_TEMPLATE).blocks
    );
    return allBlocks.filter(b => {
      const sec = savedSectionsMap.get(b.section_key);
      const content = cleanSectionContent(sec?.content || '').trim();
      const hasPhoto = Boolean(sec?.image_url && (sec?.photoMode ? sec.photoMode !== 'none' : true));
      const isFirst = b.page_number === 1 && b.section_key === 'main_breaking_news';
      const limit = effectiveCapacityFor({
        baseCapacity: b.charLimit || 2000,
        span: b.span,
        isFirstSection: isFirst,
        hasPhoto,
      });
      return content.length > 0 && content.length < limit * 0.82;
    });
  }, [templateSelection, savedSectionsMap]);

  const isMalayalam = isMalayalamEdition(edition);

  const generateHtml = (resolvedImagesMap?: Map<string, string>) => {
    const allPagesHtml = [1, 2, 3, 4]
      .map(pNum => {
        const tplKey = templateSelection[pNum] || DEFAULT_TEMPLATE;
        const pageLayout = buildPage(pNum, tplKey);
        const isFront = pNum === 1;

        const headerHtml = isFront
          ? `
          <header class="masthead-front">
            <div class="meta-bar">
              <span>${formatLongDate(edition?.date)}</span>
              <span class="uppercase">${(edition?.edition_label || 'Morning').toUpperCase()} EDITION</span>
            </div>
            <h1 class="newspaper-title">
              ${mastheadHtml(edition?.newspaper_name || 'NewsRush Daily')}
            </h1>
            <p class="tagline">YOUR TRUSTED SOURCE FOR BREAKING NEWS</p>
          </header>
          `
          : `
          <header class="masthead-inner">
            <span class="inner-title">${mastheadHtml(edition?.newspaper_name || 'NewsRush Daily')}</span>
            <span class="inner-page">${PAGE_NAMES[pNum - 1].split('·')[1]?.trim()?.toUpperCase()} · PAGE ${pNum}</span>
          </header>
          `;

        const gridTemplateRows = pageLayout.rows.map(r => `${r.weight}fr`).join(' ');

        const rowsHtml = pageLayout.rows
          .flatMap((row) =>
            row.blocks.map(block => {
              const sec = savedSectionsMap.get(block.section_key);
              const isFirst = pageLayout.blocks[0]?.section_key === block.section_key;
              const rawPhotoUrl = resolvedImagesMap?.get(block.section_key) || sec?.image_url;
              const photoUrl = normalizeImageUrl(rawPhotoUrl);
              const hasPhoto = Boolean(photoUrl && (sec?.photoMode ? sec.photoMode !== 'none' : true));
              const label = sec?.section_name?.trim() || block.section_name;
              const rawHeadline = cleanSectionTitle(sec?.title || label, sec?.content || '');
              const headline = isMalayalam ? formatMalayalamNewspaperText(rawHeadline) : rawHeadline;
              const rawContent = cleanSectionContent(sec?.content || '');
              const content = isMalayalam ? formatMalayalamNewspaperText(rawContent) : rawContent;
              const totalCols = block.span === 3 ? 5 : block.span === 2 ? 3 : 2;

              let bodyHtml = '';
              if (isFirst && hasPhoto && photoUrl) {
                // Lead story split layout: left columns full height text, right columns locked photo + text underneath
                const leftCols = Math.max(1, totalCols - 2);
                const rightCols = totalCols - leftCols;
                const { leftText, rightText } = splitLeadStoryText(
                  content,
                  block.span,
                  null,
                  null,
                  isMalayalam ? 'malayalam' : 'english'
                );
                const leadPhotoHeightMm = block.span === 3 ? 42 : block.span === 2 ? 36 : 28;
                const captionHtml = sec?.image_caption
                  ? `<figcaption class="photo-caption">${sec.image_caption}</figcaption>`
                  : '';

                bodyHtml = `
                  <div class="lead-split-wrap">
                    <div class="lead-left-col" style="flex: ${leftCols};">
                      <div class="body-columns cols-${leftCols}">${leftText}</div>
                    </div>
                    <div class="lead-right-col" style="flex: ${rightCols};">
                      <figure class="lead-photo-figure">
                        <img src="${photoUrl}" alt="" style="height: ${leadPhotoHeightMm}mm;" class="newspaper-photo" loading="eager" decoding="sync" onerror="this.onerror=null; this.style.display='none';" />
                        ${captionHtml}
                      </figure>
                      ${
                        rightText
                          ? `<div class="body-columns cols-${rightCols}" style="margin-top: 0;">${rightText}</div>`
                          : '<div style="flex: 1; min-height: 0;"></div>'
                      }
                    </div>
                  </div>
                `;
              } else if (hasPhoto && photoUrl) {
                // Other sections with photo: single photo locked at top of column 1
                const photoHeightMm = block.size === 'small' ? 24 : 33;
                const captionHtml = sec?.image_caption
                  ? `<figcaption class="photo-caption">${sec.image_caption}</figcaption>`
                  : '';
                bodyHtml = `
                  <div class="body-columns cols-${totalCols}">
                    <figure class="standard-photo-figure">
                      <img src="${photoUrl}" alt="" style="height: ${photoHeightMm}mm;" class="newspaper-photo" loading="eager" decoding="sync" onerror="this.onerror=null; this.style.display='none';" />
                      ${captionHtml}
                    </figure>
                    ${content || '<span style="color:#94a3b8; font-style:italic;">No text</span>'}
                  </div>
                `;
              } else {
                // Text only
                bodyHtml = `
                  <div class="body-columns cols-${totalCols}">
                    ${content || '<span style="color:#94a3b8; font-style:italic;">No text</span>'}
                  </div>
                `;
              }

              return `
                <section class="newspaper-section" style="grid-column: span ${block.span} / span ${block.span};">
                  <p class="section-tag">${label.toUpperCase()}</p>
                  <h2 class="headline span-${block.span}">${headline}</h2>
                  ${bodyHtml}
                </section>
              `;
            })
          )
          .join('');

        return `
        <article class="sheet ${isMalayalam ? 'edition-malayalam' : 'edition-english'}" lang="${isMalayalam ? 'ml' : 'en'}">
          ${headerHtml}
          <div class="print-grid" style="grid-template-rows: ${gridTemplateRows};">
            ${rowsHtml}
          </div>
          <footer class="sheet-footer">
            <span>${edition?.newspaper_name} · ${formatLongDate(edition?.date)}</span>
            <span>Page ${pNum} of 4</span>
          </footer>
        </article>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="${isMalayalam ? 'ml' : 'en'}">
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700&family=Gayathri:wght@400;700&family=Inter:wght@400;500;600;700&family=Manjari:wght@400;700&family=Noto+Serif+Malayalam:wght@500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600;1,700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 289mm 380mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 289mm !important;
            background: #fff;
            -webkit-font-smoothing: antialiased;
          }
          .sheet {
            width: 289mm;
            height: 380mm;
            max-height: 380mm;
            margin: 0 auto;
            padding: 10mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .sheet:not(:last-child) {
            page-break-after: always;
            break-after: page;
          }
          .sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .masthead-front {
            border-bottom: 3px solid #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
          }
          .meta-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 9pt;
            font-weight: 600;
            color: #000;
            text-transform: uppercase;
          }
          .newspaper-title {
            margin: 2mm 0 1mm 0;
            text-align: center;
            font-family: "Playfair Display", Georgia, serif;
            font-size: 42pt;
            line-height: 1;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #000;
          }
          .newspaper-title .title-daily {
            font-size: 0.7em;
            font-style: italic;
            font-weight: normal;
          }
          .tagline {
            margin: 1.5mm 0 0 0;
            text-align: center;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: #000;
          }
          .masthead-inner {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 1px solid #000;
            padding-bottom: 1.5mm;
            margin-bottom: 2mm;
          }
          .inner-title {
            font-family: "Playfair Display", Georgia, serif;
            font-size: 14pt;
            font-weight: 700;
            line-height: 1;
            color: #000;
          }
          .inner-title .title-daily {
            font-size: 0.7em;
            font-style: italic;
            font-weight: normal;
          }
          .inner-page {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 9pt;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #000;
          }
          .print-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4mm;
            flex: 1;
            min-height: 0;
            margin-top: 2mm;
            margin-bottom: 2mm;
          }
          .newspaper-section {
            display: flex;
            min-height: 0;
            flex-direction: column;
            overflow: hidden;
            border-top: 1px solid rgba(0,0,0,0.3);
            padding-top: 1.5mm;
          }
          .section-tag {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 0.12em;
            color: #000;
            text-transform: uppercase;
            margin: 0 0 1mm 0;
          }
          .headline {
            font-family: ${isMalayalam ? '"Noto Serif Malayalam", "Anek Malayalam", serif' : '"Playfair Display", Georgia, serif'};
            font-weight: 700;
            line-height: 1.1;
            margin: 0 0 1.5mm 0;
            color: #000;
            letter-spacing: -0.02em;
            break-after: avoid;
          }
          .headline.span-3 { font-size: ${isMalayalam ? '20pt' : '22pt'}; }
          .headline.span-2 { font-size: ${isMalayalam ? '20pt' : '16pt'}; }
          .headline.span-1 { font-size: ${isMalayalam ? '20pt' : '13pt'}; }

          .body-columns {
            font-family: ${isMalayalam ? '"Anek Malayalam", sans-serif' : '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
            font-size: ${isMalayalam ? '8.8pt' : '8.5pt'};
            line-height: ${isMalayalam ? '1.4' : '1.35'};
            color: #000;
            text-align: justify;
            column-gap: 4mm;
            column-rule: 0.4pt solid rgba(0,0,0,0.25);
            hyphens: ${isMalayalam ? 'none' : 'auto'};
            ${isMalayalam ? 'text-justify: inter-word; word-break: normal; overflow-wrap: break-word; line-break: loose; font-feature-settings: "kern" 1, "liga" 1;' : ''}
            flex: 1;
            min-height: 0;
            overflow: hidden;
            margin-top: 1.5mm;
          }
          .body-columns.cols-5 { column-count: 5; }
          .body-columns.cols-3 { column-count: 3; }
          .body-columns.cols-2 { column-count: 2; }
          .body-columns.cols-1 { column-count: 1; }

          .lead-split-wrap {
            display: flex;
            flex-direction: row;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            margin-top: 1.5mm;
          }
          .lead-left-col {
            display: flex;
            flex-direction: column;
            min-height: 0;
            min-width: 0;
            padding-right: 2mm;
            border-right: 0.4pt solid rgba(0,0,0,0.25);
          }
          .lead-right-col {
            display: flex;
            flex-direction: column;
            min-height: 0;
            min-width: 0;
            overflow: hidden;
            padding-left: 2mm;
          }
          .lead-photo-figure {
            width: 100%;
            margin: 0 0 1.2mm 0;
            display: block;
            flex-shrink: 0;
          }
          .standard-photo-figure {
            break-inside: avoid;
            -webkit-column-break-inside: avoid;
            page-break-inside: avoid;
            width: 100%;
            margin: 0 0 1.5mm 0;
            display: block;
          }
          .newspaper-photo {
            width: 100%;
            object-fit: cover;
            display: block;
            filter: contrast(1.05);
          }
          .photo-caption {
            font-size: 6.8pt;
            font-style: italic;
            color: rgba(0,0,0,0.75);
            line-height: 1.15;
            margin-top: 0.6mm;
            font-family: "Inter", sans-serif;
          }

          .sheet-footer {
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #000;
            padding-top: 1mm;
            margin-top: auto;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 7.5pt;
            color: #000;
          }
        </style>
      </head>
      <body>
        ${allPagesHtml}
      </body>
      </html>
    `;
  };

  const TABLOID_WIDTH = 819.2; // 289mm @ 72 PPI
  const TABLOID_HEIGHT = 1077.2; // 380mm @ 72 PPI

  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = async () => {
    if (!edition || isExporting) return;
    setIsExporting(true);
    try {
      const activeImages = resolvedImagesMap.size > 0
        ? resolvedImagesMap
        : await resolveAllSectionImages(edition.sections || []);
      const html = generateHtml(activeImages);
      await Print.printAsync({
        html,
        width: TABLOID_WIDTH,
        height: TABLOID_HEIGHT,
      });
    } catch (e: any) {
      Alert.alert('Print Error', e.message || 'Failed to print edition');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!edition || isExporting) return;
    setIsExporting(true);
    try {
      const activeImages = resolvedImagesMap.size > 0
        ? resolvedImagesMap
        : await resolveAllSectionImages(edition.sections || []);
      const html = generateHtml(activeImages);
      const { uri } = await Print.printToFileAsync({
        html,
        width: TABLOID_WIDTH,
        height: TABLOID_HEIGHT,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${edition.newspaper_name} - PDF`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Print.printAsync({
          html,
          width: TABLOID_WIDTH,
          height: TABLOID_HEIGHT,
        });
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export or print');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand500} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Compact Top Action Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={18} color="#ffffff" strokeWidth={2.2} />
          <Text style={styles.backText}>Editor</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {edition?.newspaper_name} · Print
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.printHeaderBtn, isExporting && { opacity: 0.7 }]}
            onPress={handlePrint}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#ffffff" style={{ transform: [{ scale: 0.7 }] }} />
            ) : (
              <Printer size={13} color="#ffffff" strokeWidth={2} />
            )}
            <Text style={styles.printHeaderBtnText}>{isExporting ? 'Preparing…' : 'Print'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareBtn, isExporting && { opacity: 0.7 }]}
            onPress={handleExportPDF}
            disabled={isExporting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Share2 size={15} color="#ffffff" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF Document Pager Bar */}
      <View style={styles.pagerBar}>
        <TouchableOpacity
          onPress={() => goToPage(activeSheet - 1)}
          disabled={activeSheet === 0}
          style={[styles.pagerArrowBtn, activeSheet === 0 && { opacity: 0.25 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={18} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.pagerPill}>
          <Text style={styles.pagerPillText}>
            Page {activeSheet + 1} of 4
          </Text>
          <Text style={styles.pagerSubText}>
            · {PAGE_NAMES[activeSheet].split('·')[1]?.trim()}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => goToPage(activeSheet + 1)}
          disabled={activeSheet === 3}
          style={[styles.pagerArrowBtn, activeSheet === 3 && { opacity: 0.25 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={18} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {missingCount > 0 ? (
        <View style={styles.warningBanner}>
          <AlertTriangle size={14} color="#92400e" strokeWidth={2} />
          <Text style={styles.warningText}>
            {missingCount} of 19 sections are still incomplete. Complete all sections before archiving.
          </Text>
        </View>
      ) : thinSections.length > 0 ? (
        <View style={styles.warningBanner}>
          <AlertTriangle size={14} color="#92400e" strokeWidth={2} />
          <Text style={styles.warningText}>
            {thinSections.length} section{thinSections.length === 1 ? '' : 's'} will leave white gaps ({thinSections.map(s => s.section_name).slice(0, 3).join(', ')}{thinSections.length > 3 ? '...' : ''}). Use "Expand to fit" or add a photo in the editor to fill the grid.
          </Text>
        </View>
      ) : null}

      {/* Swipeable PDF Document Viewer */}
      <FlatList
        ref={flatListRef}
        data={[1, 2, 3, 4]}
        keyExtractor={pNum => String(pNum)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialNumToRender={4}
        getItemLayout={(_, index) => ({
          length: windowWidth,
          offset: windowWidth * index,
          index,
        })}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
          if (index >= 0 && index < 4 && index !== activeSheet) {
            setActiveSheet(index);
          }
        }}
        renderItem={({ item: pNum }) => {
          const tplKey = templateSelection[pNum] || DEFAULT_TEMPLATE;
          const pageLayout = buildPage(pNum, tplKey);
          const isFront = pNum === 1;

          return (
            <View style={{ width: windowWidth, flex: 1 }}>
              <ScrollView
                style={styles.sheetContainer}
                contentContainerStyle={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.newspaperSheet}>
                  {/* Masthead */}
                  {isFront ? (
                    <View style={styles.mastheadFront}>
                      <View style={styles.mastheadMetaTop}>
                        <Text style={styles.mastheadDateText}>{formatLongDate(edition?.date)}</Text>
                        <Text style={styles.mastheadEditionText}>
                          {(edition?.edition_label || 'Morning').toUpperCase()} EDITION
                        </Text>
                      </View>
                      <View style={styles.hairlineRule} />
                      {renderMastheadTitle(edition?.newspaper_name, true)}
                      <Text style={styles.mastheadTagline}>
                        YOUR TRUSTED SOURCE FOR BREAKING NEWS
                      </Text>
                      <View style={styles.mastheadBottomBar} />
                    </View>
                  ) : (
                    <View style={styles.mastheadInner}>
                      <View style={styles.mastheadInnerRow}>
                        {renderMastheadTitle(edition?.newspaper_name, false)}
                        <Text style={styles.mastheadInnerPage}>
                          {PAGE_NAMES[pNum - 1].split('·')[1]?.trim()?.toUpperCase()} · PAGE {pNum}
                        </Text>
                      </View>
                      <View style={styles.hairlineRule} />
                    </View>
                  )}

                  {/* Multi-Column Newspaper Grid */}
                  <View style={styles.newspaperGrid}>
                    {pageLayout.rows.map((row, rowIdx) => (
                      <View
                        key={rowIdx}
                        style={[
                          styles.gridRow,
                          rowIdx > 0 && styles.gridRowDivider,
                        ]}
                      >
                        {row.blocks.map((block, blockIdx) => {
                          const sec = savedSectionsMap.get(block.section_key);
                          const isFirst = pageLayout.blocks[0]?.section_key === block.section_key;
                          const photoUrl = resolvedImagesMap.get(block.section_key) || normalizeImageUrl(sec?.image_url);
                          const hasPhoto = Boolean(photoUrl && (sec?.photoMode ? sec.photoMode !== 'none' : true));
                          const label = sec?.section_name?.trim() || block.section_name;
                          const rawHeadline = cleanSectionTitle(sec?.title || label, sec?.content || '');
                          const headline = isMalayalam ? formatMalayalamNewspaperText(rawHeadline) : rawHeadline;
                          const rawContent = cleanSectionContent(sec?.content || '');
                          const content = isMalayalam ? formatMalayalamNewspaperText(rawContent) : rawContent;
                          const totalCols = block.span === 3 ? 5 : block.span === 2 ? 3 : 2;

                          if (isFirst && hasPhoto && photoUrl) {
                            const leftCols = Math.max(1, totalCols - 2);
                            const rightCols = totalCols - leftCols;
                            const { leftText, rightText } = splitLeadStoryText(
                              content,
                              block.span,
                              null,
                              null,
                              isMalayalam ? 'malayalam' : 'english'
                            );
                            const leftColsTexts = splitTextIntoColumns(leftText, leftCols);
                            const rightColsTexts = splitTextIntoColumns(rightText, rightCols);

                            return (
                              <View
                                key={block.section_key || blockIdx}
                                style={[
                                  styles.articleBlock,
                                  { flex: block.span },
                                  blockIdx > 0 && styles.articleColDivider,
                                ]}
                              >
                                <Text style={styles.articleSectionLabel}>{label.toUpperCase()}</Text>
                                <Text
                                  style={[
                                    styles.articleHeadline,
                                    block.span === 3
                                      ? styles.headlineSpan3
                                      : block.span === 2
                                      ? styles.headlineSpan2
                                      : styles.headlineSpan1,
                                  ]}
                                >
                                  {headline || 'Untitled Story'}
                                </Text>

                                <View style={styles.leadSplitRow}>
                                  {/* Left columns */}
                                  <View style={[styles.leadLeftColsWrap, { flex: leftCols }]}>
                                    <View style={styles.articleColumnsContainer}>
                                      {leftColsTexts.map((colText, colIdx) => (
                                        <View
                                          key={colIdx}
                                          style={[
                                            styles.articleColumn,
                                            colIdx > 0 && styles.articleColumnDivider,
                                          ]}
                                        >
                                          <Text style={[styles.articleBody, isMalayalam && styles.malayalamBody]}>
                                            {colText}
                                          </Text>
                                        </View>
                                      ))}
                                    </View>
                                  </View>

                                  {/* Right columns with locked photo and text */}
                                  <View style={[styles.leadRightColsWrap, { flex: rightCols }]}>
                                    <RNImage
                                      source={{ uri: photoUrl }}
                                      style={styles.previewLeadPhoto}
                                      resizeMode="cover"
                                      onError={(e) => console.warn('Preview Lead Image Error:', block.section_key, e.nativeEvent.error)}
                                    />
                                    {Boolean(sec?.image_caption) && (
                                      <Text style={styles.previewPhotoCaption} numberOfLines={2}>
                                        {sec?.image_caption}
                                      </Text>
                                    )}
                                    {rightText ? (
                                      <View style={[styles.articleColumnsContainer, { marginTop: 4 }]}>
                                        {rightColsTexts.map((colText, colIdx) => (
                                          <View
                                            key={colIdx}
                                            style={[
                                              styles.articleColumn,
                                              colIdx > 0 && styles.articleColumnDivider,
                                            ]}
                                          >
                                            <Text style={[styles.articleBody, isMalayalam && styles.malayalamBody]}>
                                              {colText}
                                            </Text>
                                          </View>
                                        ))}
                                      </View>
                                    ) : null}
                                  </View>
                                </View>
                              </View>
                            );
                          }

                          const columnTexts = splitTextIntoColumns(content, totalCols);

                          return (
                            <View
                              key={block.section_key || blockIdx}
                              style={[
                                styles.articleBlock,
                                { flex: block.span },
                                blockIdx > 0 && styles.articleColDivider,
                              ]}
                            >
                              <Text style={styles.articleSectionLabel}>{label.toUpperCase()}</Text>
                              <Text
                                style={[
                                  styles.articleHeadline,
                                  block.span === 3
                                    ? styles.headlineSpan3
                                    : block.span === 2
                                    ? styles.headlineSpan2
                                    : styles.headlineSpan1,
                                ]}
                              >
                                {headline || 'Untitled Story'}
                              </Text>

                              {hasPhoto && photoUrl && (
                                <View style={styles.previewStandardPhotoWrap}>
                                  <RNImage
                                    source={{ uri: photoUrl }}
                                    style={styles.previewStandardPhoto}
                                    resizeMode="cover"
                                    onError={(e) => console.warn('Preview Standard Image Error:', block.section_key, e.nativeEvent.error)}
                                  />
                                  {Boolean(sec?.image_caption) && (
                                    <Text style={styles.previewPhotoCaption} numberOfLines={2}>
                                      {sec?.image_caption}
                                    </Text>
                                  )}
                                </View>
                              )}

                              {content ? (
                                <View style={styles.articleColumnsContainer}>
                                  {columnTexts.map((colText, colIdx) => (
                                    <View
                                      key={colIdx}
                                      style={[
                                        styles.articleColumn,
                                        colIdx > 0 && styles.articleColumnDivider,
                                      ]}
                                    >
                                      <Text style={[styles.articleBody, isMalayalam && styles.malayalamBody]}>
                                        {colText}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : (
                                <Text style={styles.emptyBodyText}>No text</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  {/* Running Newspaper Footer */}
                  <View style={styles.sheetFooter}>
                    <View style={styles.hairlineRule} />
                    <View style={styles.footerMetaRow}>
                      <Text style={styles.footerMetaText}>
                        {edition?.newspaper_name} · {formatLongDate(edition?.date)}
                      </Text>
                      <Text style={styles.footerMetaText}>
                        Page {pNum} of 4
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          );
        }}
      />

      {/* Bottom Completion Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 10) },
        ]}
      >
        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusVal}>{edition?.status?.toUpperCase()}</Text>
        </View>

        {edition?.status === 'completed' ? (
          <View style={styles.completedBadge}>
            <Check size={13} color={Colors.success} strokeWidth={2.5} />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.completeBtn, missingCount > 0 && { opacity: 0.5 }]}
            onPress={handleMarkCompleted}
            disabled={completing || missingCount > 0}
          >
            {completing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Check size={14} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.completeBtnText}>Mark Completed</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy950 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.navy900,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 3,
  },
  backText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerActions: { flexDirection: 'row', gap: 6 },
  printHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  printHeaderBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  shareBtn: {
    backgroundColor: Colors.brand500,
    borderRadius: 7,
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.navy900,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  pagerArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
  },
  pagerPillText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pagerSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warningBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  warningText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#92400e',
  },
  sheetContainer: { flex: 1, backgroundColor: '#334155' },
  sheetScroll: { padding: 12, alignItems: 'center' },
  newspaperSheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  mastheadFront: {
    marginBottom: 8,
  },
  mastheadMetaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 3,
  },
  mastheadDateText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#1e293b',
  },
  mastheadEditionText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  hairlineRule: {
    height: 1,
    backgroundColor: '#000000',
    width: '100%',
  },
  mastheadTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  mastheadTitleMain: {
    fontFamily: SERIF_FONT,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  mastheadTitleItalic: {
    fontFamily: SERIF_FONT,
    fontSize: 25,
    lineHeight: 34,
    fontStyle: 'italic',
    fontWeight: 'normal',
    color: '#000000',
  },
  slicedCharContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  slicedCutOverflow: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  sliceCutBar: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  sliceCutBarLarge: {
    width: 2.2,
  },
  sliceCutBarSmall: {
    width: 1.2,
  },
  mastheadTagline: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  mastheadBottomBar: {
    height: 3.5,
    backgroundColor: '#000000',
    width: '100%',
  },
  mastheadInner: {
    marginBottom: 8,
  },
  mastheadInnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 4,
  },
  mastheadInnerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mastheadInnerTitleMain: {
    fontFamily: SERIF_FONT,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#000000',
  },
  mastheadInnerTitleItalic: {
    fontFamily: SERIF_FONT,
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
    color: '#000000',
  },
  mastheadInnerPage: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  newspaperGrid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    width: '100%',
  },
  gridRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.22)',
    paddingTop: 8,
    marginTop: 8,
  },
  articleBlock: {
    minWidth: 0,
  },
  articleColDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.22)',
    paddingLeft: 8,
    marginLeft: 8,
  },
  articleSectionLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  articleHeadline: {
    fontFamily: SERIF_FONT,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 3,
  },
  headlineSpan3: {
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  headlineSpan2: {
    fontSize: 15.5,
    lineHeight: 18.5,
    letterSpacing: -0.2,
  },
  headlineSpan1: {
    fontSize: 13,
    lineHeight: 15.5,
    letterSpacing: -0.1,
  },
  articleColumnsContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 3,
  },
  articleColumn: {
    flex: 1,
    minWidth: 0,
  },
  articleColumnDivider: {
    borderLeftWidth: 0.6,
    borderLeftColor: 'rgba(0, 0, 0, 0.22)',
    marginLeft: 5,
    paddingLeft: 5,
  },
  articleBody: {
    fontFamily: SERIF_FONT,
    fontSize: 9,
    lineHeight: 12.8,
    color: '#0f172a',
    textAlign: 'justify',
  },
  malayalamBody: {
    fontSize: 8.5,
    lineHeight: 12.2,
  },
  emptyBodyText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#94a3b8',
    marginTop: 3,
  },
  sheetFooter: {
    marginTop: 12,
  },
  footerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  footerMetaText: {
    fontSize: 8.5,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomBar: {
    backgroundColor: Colors.navy900,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statusInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  statusVal: { color: '#ffffff', fontSize: 12.5, fontWeight: '700' },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  completeBtnText: { color: '#ffffff', fontSize: 12.5, fontWeight: '700' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  completedBadgeText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '700',
  },
  leadSplitRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
    width: '100%',
  },
  leadLeftColsWrap: {
    paddingRight: 4,
    borderRightWidth: 0.6,
    borderRightColor: 'rgba(0,0,0,0.22)',
    minWidth: 0,
  },
  leadRightColsWrap: {
    paddingLeft: 4,
    minWidth: 0,
  },
  previewLeadPhoto: {
    width: '100%',
    height: 75,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'stretch',
  },
  previewStandardPhotoWrap: {
    width: '100%',
    marginVertical: 4,
  },
  previewStandardPhoto: {
    width: '100%',
    height: 60,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'stretch',
  },
  previewPhotoCaption: {
    fontSize: 7.5,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 2,
    lineHeight: 9.5,
  },
});
