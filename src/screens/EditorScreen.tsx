import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from '../components/CustomAlert';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Printer,
  Check,
  ArrowRight,
  Sparkles,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Edition, Section, ValidationResponse, AiLanguage } from '../types';
import { getEdition, updateEditionStatus, validateEdition, saveSection } from '../api/editions';
import { expandContent } from '../api/ai';
import TemplateThumb from '../components/TemplateThumb';
import { buildPage, templatesForPage, DEFAULT_TEMPLATE } from '../data/templates';
import { readTemplates, writeTemplate } from '../lib/templateStore';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Editor'>;

const PAGE_NAMES = [
  'Front Page',
  'Kerala & District',
  'Sports & Business',
  'Features & Evening',
];

const UNDERFILL_RATIO = 0.6;

export default function EditorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { editionId } = route.params;

  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [fillState, setFillState] = useState<{ running: boolean; done: number; total: number }>({
    running: false,
    done: 0,
    total: 0,
  });
  const cancelFillRef = useRef(false);

  const [templateSelection, setTemplateSelection] = useState<Record<number, string>>(() =>
    readTemplates(editionId)
  );

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getEdition(editionId);
      setEdition(data);
      setTemplateSelection(readTemplates(editionId));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load edition');
      if (!quiet) navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [editionId])
  );

  const pageNumber = activePageIndex + 1;
  const currentTemplateKey = templateSelection[pageNumber] || DEFAULT_TEMPLATE;
  const builtPage = useMemo(
    () => buildPage(pageNumber, currentTemplateKey),
    [pageNumber, currentTemplateKey]
  );
  const availableTemplates = useMemo(() => templatesForPage(pageNumber), [pageNumber]);

  const allBuiltPages = useMemo(
    () =>
      [1, 2, 3, 4].map(pNum => buildPage(pNum, templateSelection[pNum] || DEFAULT_TEMPLATE)),
    [templateSelection]
  );

  const savedSectionsMap = useMemo(() => {
    const map = new Map<string, Section>();
    (edition?.sections || []).forEach(s => {
      if (s.section_key) {
        map.set(s.section_key, s);
      }
    });
    return map;
  }, [edition]);

  const completedKeySet = useMemo(() => {
    const set = new Set<string>();
    (edition?.sections || []).forEach(s => {
      if (s.section_key && s.status === 'completed' && s.title && s.content) {
        set.add(s.section_key);
      }
    });
    return set;
  }, [edition]);

  const underFilledBlocks = useMemo(() => {
    return allBuiltPages
      .flatMap(p => p.blocks)
      .filter(b => {
        const saved = savedSectionsMap.get(b.section_key);
        const text = saved?.content?.trim() || '';
        if (!text) return false;
        return text.length < b.charLimit * UNDERFILL_RATIO;
      });
  }, [allBuiltPages, savedSectionsMap]);

  const handleSelectTemplate = (tplKey: string) => {
    const updated = writeTemplate(editionId, pageNumber, tplKey);
    setTemplateSelection({ ...updated });
  };

  const handleCheckReadiness = async () => {
    setCheckingReadiness(true);
    try {
      const res = await validateEdition(editionId);
      setValidation(res);
      const fresh = await getEdition(editionId);
      setEdition(fresh);
    } catch (e: any) {
      Alert.alert('Readiness Check Error', e.message || 'Could not validate edition');
    } finally {
      setCheckingReadiness(false);
    }
  };

  const editionLanguage: AiLanguage =
    (edition?.language || 'malayalam').toLowerCase() === 'english' ? 'english' : 'malayalam';

  const handleFillThinSections = async () => {
    if (fillState.running) {
      cancelFillRef.current = true;
      return;
    }
    if (underFilledBlocks.length === 0) return;

    cancelFillRef.current = false;
    setFillState({ running: true, done: 0, total: underFilledBlocks.length });

    for (let i = 0; i < underFilledBlocks.length; i++) {
      if (cancelFillRef.current) break;
      const candidate = underFilledBlocks[i];
      const saved = savedSectionsMap.get(candidate.section_key);
      if (!saved?.content?.trim()) continue;

      try {
        const res = await expandContent({
          summary: saved.content,
          character_limit: candidate.charLimit,
          language: editionLanguage,
        });
        await saveSection(editionId, {
          page_number: candidate.page_number || 1,
          section_key: candidate.section_key,
          section_name: saved.section_name || candidate.section_name,
          title: saved.title || res.generated_title || null,
          content: res.expanded_content,
          status: saved.status || 'completed',
        });
      } catch {}

      setFillState({ running: true, done: i + 1, total: underFilledBlocks.length });
      if (i < underFilledBlocks.length - 1) {
        await new Promise(r => setTimeout(r, 700));
      }
    }

    setFillState({ running: false, done: 0, total: 0 });
    await load(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand500} />
      </View>
    );
  }

  const totalDone = completedKeySet.size;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Compact Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={18} color="#ffffff" strokeWidth={2.2} />
          <Text style={styles.backText}>Workspace</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {edition?.newspaper_name || 'NewsRush'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {edition?.edition_label || 'Edition'} · {totalDone}/19 Done
          </Text>
        </View>

        <TouchableOpacity
          style={styles.printHeaderBtn}
          onPress={() =>
            navigation.navigate('PrintEdition', { editionId: (edition?.id || editionId) as any })
          }
          activeOpacity={0.8}
        >
          <Printer size={14} color="#ffffff" strokeWidth={2} />
          <Text style={styles.printHeaderText}>Print</Text>
        </TouchableOpacity>
      </View>

      {/* Compact Toolbar: Actions */}
      <View style={styles.statusBar}>
        <View style={styles.toolbarActions}>
          {(underFilledBlocks.length > 0 || fillState.running) && (
            <TouchableOpacity
              style={styles.fillBtn}
              onPress={handleFillThinSections}
              activeOpacity={0.8}
            >
              <Sparkles size={13} color={Colors.brand600} strokeWidth={2} />
              <Text style={styles.fillBtnText}>
                {fillState.running
                  ? `Filling ${fillState.done}/${fillState.total}`
                  : `Fill ${underFilledBlocks.length} thin`}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.readinessBtn}
            onPress={handleCheckReadiness}
            disabled={checkingReadiness}
            activeOpacity={0.85}
          >
            {checkingReadiness ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.readinessBtnText}>Check readiness</Text>
                <ArrowRight size={13} color="#ffffff" strokeWidth={2.2} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Readiness Check Floating Banner (like NewsRush-FE) */}
      {validation && (
        <View
          style={[
            styles.validationCard,
            validation.all_completed ? styles.validationSuccess : styles.validationWarning,
          ]}
        >
          <View style={styles.validationTop}>
            <View style={styles.validationTitleRow}>
              <View
                style={[
                  styles.validationBadgeIcon,
                  { backgroundColor: validation.all_completed ? Colors.success : Colors.warning },
                ]}
              >
                {validation.all_completed ? (
                  <Check size={12} color="#ffffff" strokeWidth={2.5} />
                ) : (
                  <Info size={12} color="#ffffff" strokeWidth={2.5} />
                )}
              </View>
              <Text style={styles.validationTitle}>
                {validation.all_completed
                  ? 'Readiness Check Passed — All 19 sections complete'
                  : `${validation.incomplete_sections?.length || 0} sections still incomplete (tap to jump):`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setValidation(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={15} color={Colors.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {validation.all_completed ? (
            <TouchableOpacity
              style={styles.validationPrintBtn}
              onPress={() => {
                setValidation(null);
                navigation.navigate('PrintEdition', {
                  editionId: (edition?.id || editionId) as any,
                });
              }}
            >
              <Printer size={13} color="#ffffff" strokeWidth={2} />
              <Text style={styles.validationPrintText}>Open Print Preview</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.jumpChipsRow}
            >
              {(validation.incomplete_sections || []).map(sec => {
                const pIdx = Math.max(0, (sec.page_number || 1) - 1);
                const pageDef = allBuiltPages[pIdx];
                const blk = pageDef?.blocks.find(b => b.section_key === sec.section_key);
                const saved = savedSectionsMap.get(sec.section_key);
                return (
                  <TouchableOpacity
                    key={sec.section_key}
                    style={styles.jumpChip}
                    onPress={() => {
                      setActivePageIndex(pIdx);
                      setValidation(null);
                      navigation.navigate('SectionEditor', {
                        editionId,
                        pageId: sec.page_number,
                        sectionKey: sec.section_key,
                        sectionName: saved?.section_name || blk?.section_name || sec.section_name,
                        canonicalName: blk?.section_name || sec.section_name,
                        charLimit: blk?.charLimit || 2000,
                        initialTitle: saved?.title || '',
                        initialContent: saved?.content || '',
                        initialStatus: saved?.status || 'draft',
                        editionStatus: (edition?.status || 'draft') as any,
                        language: editionLanguage,
                      });
                    }}
                  >
                    <Text style={styles.jumpChipPage}>P{sec.page_number}</Text>
                    <Text style={styles.jumpChipName}>{sec.section_name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* 4 Page Tab Navigation */}
      <View style={styles.pageTabs}>
        {[1, 2, 3, 4].map((pNum, idx) => {
          const isSelected = activePageIndex === idx;
          const pageDef = allBuiltPages[idx];
          const pageDoneCount = pageDef.blocks.filter(b =>
            completedKeySet.has(b.section_key)
          ).length;
          const allPageDone = pageDoneCount === pageDef.blocks.length;

          return (
            <TouchableOpacity
              key={pNum}
              style={[styles.pageTab, isSelected && styles.pageTabActive]}
              onPress={() => setActivePageIndex(idx)}
            >
              <View style={styles.pageTabTopRow}>
                <Text style={[styles.pageTabNum, isSelected && styles.pageTabNumActive]}>
                  Page {pNum}
                </Text>
                <Text
                  style={[
                    styles.pageTabCount,
                    allPageDone
                      ? { color: Colors.success }
                      : isSelected
                      ? { color: Colors.brand600 }
                      : { color: Colors.muted },
                  ]}
                >
                  {pageDoneCount}/{pageDef.blocks.length}
                </Text>
              </View>
              <Text
                style={[styles.pageTabLabel, isSelected && styles.pageTabLabelActive]}
                numberOfLines={1}
              >
                {PAGE_NAMES[idx]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === 'android' ? 44 : 24) },
        ]}
      >
        {/* Collapsible Template Bar */}
        <View style={styles.templateSection}>
          <TouchableOpacity
            style={styles.templateHeaderRow}
            onPress={() => setShowTemplates(v => !v)}
            activeOpacity={0.75}
          >
            <View style={styles.templateHeaderLeft}>
              <LayoutTemplate size={15} color={Colors.brand500} strokeWidth={2} />
              <Text style={styles.templateHeaderTitle}>
                Layout: <Text style={{ color: Colors.navy900 }}>{builtPage.templateName}</Text>
              </Text>
              <Text style={styles.templateHeaderDesc} numberOfLines={1}>
                · {builtPage.description}
              </Text>
            </View>
            <View style={styles.templateToggleBtn}>
              <Text style={styles.templateToggleText}>{showTemplates ? 'Hide' : 'Change'}</Text>
              {showTemplates ? (
                <ChevronUp size={14} color={Colors.brand600} strokeWidth={2} />
              ) : (
                <ChevronDown size={14} color={Colors.brand600} strokeWidth={2} />
              )}
            </View>
          </TouchableOpacity>

          {showTemplates && (
            <View style={styles.templateCardsRow}>
              {availableTemplates.map(tpl => {
                const isCurrent = tpl.key === currentTemplateKey;
                const previewPage = buildPage(pageNumber, tpl.key);
                return (
                  <TouchableOpacity
                    key={tpl.key}
                    style={[styles.templateCard, isCurrent && styles.templateCardActive]}
                    onPress={() => handleSelectTemplate(tpl.key)}
                  >
                    <TemplateThumb
                      blocks={previewPage.blocks}
                      completedKeys={completedKeySet}
                    />
                    <Text
                      style={[
                        styles.templateCardName,
                        isCurrent && styles.templateCardNameActive,
                      ]}
                    >
                      {tpl.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Compact Section Cards */}
        {builtPage.blocks.map((block, idx) => {
          const saved = savedSectionsMap.get(block.section_key);
          const customLabel = saved?.section_name?.trim() || block.section_name;
          const headline = saved?.title || '';
          const body = saved?.content || '';
          const isDone = completedKeySet.has(block.section_key);
          const currentChars = body.length;
          const fillPercent = Math.min(100, Math.round((currentChars / block.charLimit) * 100));

          return (
            <TouchableOpacity
              key={block.section_key}
              style={[styles.sectionCard, isDone && styles.sectionCardDone]}
              onPress={() =>
                navigation.navigate('SectionEditor', {
                  editionId,
                  pageId: pageNumber,
                  sectionKey: block.section_key,
                  sectionName: customLabel,
                  canonicalName: block.section_name,
                  charLimit: block.charLimit,
                  initialTitle: headline,
                  initialContent: body,
                  initialStatus: saved?.status || 'draft',
                  sectionIndex: idx,
                  editionStatus: (edition?.status || 'draft') as any,
                  language: editionLanguage,
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.blockInfo}>
                  <Text style={styles.blockName} numberOfLines={1}>
                    {customLabel}
                  </Text>
                  <Text style={styles.capacityText}>
                    {currentChars}/{block.charLimit} chars ({fillPercent}%) · {block.size.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.sectionHeadline, !headline && styles.placeholderHeadline]}
                numberOfLines={1}
              >
                {headline || 'Untitled article — tap to write or dictate'}
              </Text>

              {body ? (
                <Text style={styles.sectionBody} numberOfLines={2}>
                  {body}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.miniProgressTrack}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${fillPercent}%`,
                        backgroundColor: isDone ? Colors.success : Colors.brand500,
                      },
                    ]}
                  />
                </View>
                <View style={styles.editActionRow}>
                  <Sparkles size={12} color={Colors.brand500} strokeWidth={2} />
                  <Text style={styles.editAction}>Edit & AI</Text>
                  <ArrowRight size={12} color={Colors.brand500} strokeWidth={2.2} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    paddingVertical: 3,
  },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  headerTitle: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  printHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  printHeaderText: { color: '#ffffff', fontSize: 12.5, fontWeight: '700' },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.brand500,
    backgroundColor: Colors.brand50,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  fillBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.brand600,
  },
  readinessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.navy900,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readinessBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  validationCard: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  validationSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  validationWarning: {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warningBorder,
  },
  validationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  validationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  validationBadgeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy900,
    flex: 1,
  },
  validationPrintBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 7,
  },
  validationPrintText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  jumpChipsRow: {
    gap: 6,
    paddingTop: 8,
  },
  jumpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  jumpChipPage: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  jumpChipName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.ink,
  },
  pageTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pageTabActive: {
    borderBottomColor: Colors.brand500,
    backgroundColor: Colors.brand50,
  },
  pageTabTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageTabNum: { fontSize: 12, fontWeight: '800', color: Colors.ink },
  pageTabNumActive: { color: Colors.brand600 },
  pageTabCount: { fontSize: 10.5, fontWeight: '700' },
  pageTabLabel: { fontSize: 10, color: Colors.muted, marginTop: 1, fontWeight: '500' },
  pageTabLabelActive: { color: Colors.brand600, fontWeight: '600' },
  scroll: { padding: 12, paddingBottom: 24 },
  templateSection: {
    backgroundColor: '#ffffff',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  templateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  templateHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.muted,
  },
  templateHeaderDesc: {
    fontSize: 11.5,
    color: Colors.muted,
    flex: 1,
  },
  templateToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 8,
  },
  templateToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand600,
  },
  templateCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  templateCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 7,
    alignItems: 'center',
  },
  templateCardActive: {
    borderColor: Colors.brand500,
    backgroundColor: Colors.brand50,
  },
  templateCardName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    marginTop: 5,
    textAlign: 'center',
  },
  templateCardNameActive: {
    color: Colors.brand600,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionCardDone: {
    borderColor: Colors.successBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  blockInfo: { flex: 1, marginRight: 8 },
  blockName: { fontSize: 13.5, fontWeight: '700', color: Colors.navy900 },
  capacityText: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  doneTag: { backgroundColor: Colors.successLight, borderWidth: 1, borderColor: Colors.successBorder },
  draftTag: { backgroundColor: Colors.navy50 },
  statusTagText: { fontSize: 10.5, fontWeight: '700' },
  doneTagText: { color: Colors.success },
  draftTagText: { color: Colors.muted },
  sectionHeadline: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 19,
    marginBottom: 3,
  },
  placeholderHeadline: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  sectionBody: {
    fontSize: 12.5,
    color: Colors.muted,
    lineHeight: 17,
  },
  cardFooter: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  miniProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.navy50,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editAction: { fontSize: 12, fontWeight: '700', color: Colors.brand500 },
});
