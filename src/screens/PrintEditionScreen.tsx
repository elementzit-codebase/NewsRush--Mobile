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
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Share2,
  Check,
  AlertTriangle,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Edition } from '../types';
import { getEdition, updateEditionStatus } from '../api/editions';
import { buildPage, DEFAULT_TEMPLATE } from '../data/templates';
import { readTemplates } from '../lib/templateStore';
import { RootStackParamList } from '../navigation';

type Route = RouteProp<RootStackParamList, 'PrintEdition'>;

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

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

export default function PrintEditionScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { editionId } = route.params;
  const [edition, setEdition] = useState<Edition | null>(null);
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
      const data = await getEdition(editionId);
      setEdition(data);
      setTemplateSelection(readTemplates(editionId));
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

  const generateHtml = () => {
    const allPagesHtml = [1, 2, 3, 4]
      .map(pNum => {
        const tplKey = templateSelection[pNum] || DEFAULT_TEMPLATE;
        const pageLayout = buildPage(pNum, tplKey);
        const isFront = pNum === 1;

        const headerHtml = isFront
          ? `
          <div class="masthead-front">
            <div class="meta-bar">
              <span>${formatLongDate(edition?.date)}</span>
              <span>${(edition?.edition_label || 'Morning').toUpperCase()} EDITION</span>
            </div>
            <div class="newspaper-name-large">${edition?.newspaper_name || 'NEWSRUSH'}</div>
            <div class="tagline">YOUR TRUSTED SOURCE FOR BREAKING NEWS</div>
            <div class="double-rule-top"></div>
            <div class="double-rule-bottom"></div>
          </div>
          `
          : `
          <div class="masthead-inner">
            <span class="inner-title">${edition?.newspaper_name || 'NEWSRUSH'}</span>
            <span class="inner-page">${PAGE_NAMES[pNum - 1].split('·')[1]?.trim()?.toUpperCase()} · PAGE ${pNum}</span>
          </div>
          `;

        const rowsHtml = pageLayout.rows
          .map((row, rIdx) => {
            const colsHtml = row.blocks
              .map(block => {
                const saved = savedSectionsMap.get(block.section_key);
                const label = saved?.section_name || block.section_name;
                const headline = saved?.title || label;
                const body =
                  saved?.content ||
                  '<span style="color:#94a3b8; font-style:italic;">No text</span>';
                return `
                  <div class="article-col span-${block.span}" style="flex: ${block.span};">
                    <div class="section-tag">${label.toUpperCase()}</div>
                    <div class="headline span-${block.span}">${headline}</div>
                    <div class="body">${body}</div>
                  </div>
                `;
              })
              .join('');
            return `<div class="row ${rIdx > 0 ? 'row-divider' : ''}">${colsHtml}</div>`;
          })
          .join('');

        return `
        <div class="sheet ${pNum < 4 ? 'page-break' : ''}">
          ${headerHtml}
          <div class="rows-container">
            ${rowsHtml}
          </div>
          <div class="sheet-footer">
            <span>${edition?.newspaper_name} · ${formatLongDate(edition?.date)}</span>
            <span>Page ${pNum} of 4</span>
          </div>
        </div>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: 289mm 380mm; margin: 10mm; }
          body { font-family: "Playfair Display", "Times New Roman", Georgia, serif; margin: 0; padding: 16px; color: #000; background: #fff; }
          .sheet { max-width: 860px; margin: 0 auto 36px auto; padding-bottom: 16px; }
          .page-break { page-break-after: always; }
          .masthead-front { text-align: center; margin-bottom: 12px; }
          .meta-bar { display: flex; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 600; color: #334155; border-bottom: 1px solid #000; padding-bottom: 3px; }
          .newspaper-name-large { font-size: 42px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 2px 0; }
          .tagline { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 8.5px; letter-spacing: 3px; text-transform: uppercase; color: #475569; margin: 0 0 6px 0; }
          .double-rule-top { height: 3px; background: #000; width: 100%; margin-top: 4px; }
          .double-rule-bottom { height: 1px; background: #000; width: 100%; margin-top: 2px; margin-bottom: 12px; }
          .masthead-inner { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 12px; }
          .inner-title { font-size: 18px; font-weight: bold; }
          .inner-page { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10.5px; font-weight: bold; text-transform: uppercase; color: #475569; }
          .rows-container { display: flex; flex-direction: column; gap: 12px; }
          .row { display: flex; flex-direction: row; gap: 14px; }
          .row-divider { border-top: 1px solid rgba(0,0,0,0.2); padding-top: 10px; margin-top: 4px; }
          .article-col { min-width: 0; }
          .article-col + .article-col { border-left: 1px solid rgba(0,0,0,0.2); padding-left: 12px; }
          .section-tag { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 9px; font-weight: 800; letter-spacing: 0.8px; color: #1e293b; text-transform: uppercase; margin-bottom: 2px; }
          .headline { font-weight: bold; line-height: 1.15; margin: 0 0 5px 0; color: #000; }
          .headline.span-3 { font-size: 22px; }
          .headline.span-2 { font-size: 17px; }
          .headline.span-1 { font-size: 14px; }
          .body { font-size: 12px; line-height: 1.5; color: #111827; text-align: justify; white-space: pre-wrap; }
          .sheet-footer { display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 4px; margin-top: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 9px; color: #64748b; }
        </style>
      </head>
      <body>
        ${allPagesHtml}
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    if (!edition) return;
    try {
      const html = generateHtml();
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Print Error', e.message || 'Failed to print edition');
    }
  };

  const handleExportPDF = async () => {
    if (!edition) return;
    try {
      const html = generateHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${edition.newspaper_name} - PDF`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch {
      try {
        const html = generateHtml();
        await Print.printAsync({ html });
      } catch (err: any) {
        Alert.alert('Export Error', err.message || 'Failed to export or print');
      }
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
          <TouchableOpacity style={styles.printHeaderBtn} onPress={handlePrint}>
            <Printer size={13} color="#ffffff" strokeWidth={2} />
            <Text style={styles.printHeaderBtnText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleExportPDF}
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

      {missingCount > 0 && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={14} color="#92400e" strokeWidth={2} />
          <Text style={styles.warningText}>
            {missingCount} of 19 sections are still incomplete. Complete all sections before archiving.
          </Text>
        </View>
      )}

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
                      <Text style={styles.mastheadTitleLarge}>
                        {edition?.newspaper_name?.toUpperCase() || 'NEWSRUSH'}
                      </Text>
                      <Text style={styles.mastheadTagline}>
                        YOUR TRUSTED SOURCE FOR BREAKING NEWS
                      </Text>
                      <View style={styles.mastheadDoubleRuleTop} />
                      <View style={styles.mastheadDoubleRuleBottom} />
                    </View>
                  ) : (
                    <View style={styles.mastheadInner}>
                      <View style={styles.mastheadInnerRow}>
                        <Text style={styles.mastheadInnerTitle}>
                          {edition?.newspaper_name?.toUpperCase() || 'NEWSRUSH'}
                        </Text>
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
                          const label = sec?.section_name?.trim() || block.section_name;
                          const headline = sec?.title?.trim() || '';
                          const content = sec?.content?.trim() || '';

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
                              <Text style={styles.articleBody}>
                                {content || 'No content provided for this section.'}
                              </Text>
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
      <View style={styles.bottomBar}>
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
    color: '#334155',
  },
  mastheadEditionText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.5,
  },
  hairlineRule: {
    height: 1,
    backgroundColor: '#000000',
    width: '100%',
  },
  mastheadTitleLarge: {
    fontFamily: SERIF_FONT,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 5,
    marginBottom: 2,
  },
  mastheadTagline: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  mastheadDoubleRuleTop: {
    height: 3,
    backgroundColor: '#000000',
    width: '100%',
  },
  mastheadDoubleRuleBottom: {
    height: 1,
    backgroundColor: '#000000',
    width: '100%',
    marginTop: 2,
    marginBottom: 8,
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
  mastheadInnerTitle: {
    fontFamily: SERIF_FONT,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 0.5,
  },
  mastheadInnerPage: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
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
    borderTopColor: 'rgba(0,0,0,0.2)',
    paddingTop: 8,
    marginTop: 8,
  },
  articleBlock: {
    minWidth: 0,
  },
  articleColDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.2)',
    paddingLeft: 8,
    marginLeft: 8,
  },
  articleSectionLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  articleHeadline: {
    fontFamily: SERIF_FONT,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  headlineSpan3: {
    fontSize: 18,
    lineHeight: 22,
  },
  headlineSpan2: {
    fontSize: 15,
    lineHeight: 19,
  },
  headlineSpan1: {
    fontSize: 13,
    lineHeight: 16.5,
  },
  articleBody: {
    fontFamily: SERIF_FONT,
    fontSize: 11,
    lineHeight: 16,
    color: '#1e293b',
    textAlign: 'justify',
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
});
