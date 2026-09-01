import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { Edition, Section } from '../types';
import { getEdition, updateEditionStatus, validateEdition } from '../api/editions';
import StatusBadge from '../components/StatusBadge';
import TemplateThumb from '../components/TemplateThumb';
import { buildPage, templatesForPage, DEFAULT_TEMPLATE } from '../data/templates';
import { readTemplates, writeTemplate } from '../lib/templateStore';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Editor'>;

const PAGE_NAMES = [
  'Page 1 · Front Page',
  'Page 2 · Kerala & District',
  'Page 3 · Sports & Business',
  'Page 4 · Features & Evening',
];

const STATUS_FLOW: Record<string, string> = {
  draft: 'in_progress',
  in_progress: 'ready',
  ready: 'completed',
};

const STATUS_BTN: Record<string, string> = {
  draft: 'Start Working',
  in_progress: 'Validate / Ready',
  ready: 'Mark Complete',
};

export default function EditorScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { editionId } = route.params;
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [advancing, setAdvancing] = useState(false);
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

  useFocusEffect(useCallback(() => { load(true); }, [editionId]));

  const pageNumber = activePageIndex + 1;
  const currentTemplateKey = templateSelection[pageNumber] || DEFAULT_TEMPLATE;
  const builtPage = useMemo(
    () => buildPage(pageNumber, currentTemplateKey),
    [pageNumber, currentTemplateKey]
  );
  const availableTemplates = useMemo(() => templatesForPage(pageNumber), [pageNumber]);

  const handleSelectTemplate = (tplKey: string) => {
    const updated = writeTemplate(editionId, pageNumber, tplKey);
    setTemplateSelection({ ...updated });
  };

  const handleAdvanceStatus = async () => {
    if (!edition) return;
    const next = STATUS_FLOW[edition.status];
    if (!next) return;

    if (edition.status === 'in_progress') {
      setAdvancing(true);
      try {
        const res = await validateEdition(editionId);
        if (!res.all_completed) {
          Alert.alert(
            'Incomplete Sections',
            `To mark this edition ready, complete all 19 sections:\n\n${(res.issues || []).join('\n')}`
          );
          setAdvancing(false);
          return;
        }
      } catch {}
      setAdvancing(false);
    }

    Alert.alert('Update Status', `Move edition status to "${next.replace('_', ' ')}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            const updated = await updateEditionStatus(editionId, next as any);
            setEdition(updated);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not update status');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand500} />
      </View>
    );
  }

  const savedSectionsMap = new Map<string, Section>();
  const completedKeySet = new Set<string>();

  (edition?.sections || []).forEach(s => {
    if (s.section_key) {
      savedSectionsMap.set(s.section_key, s);
      if (s.status === 'completed' && s.title && s.content) {
        completedKeySet.add(s.section_key);
      }
    }
  });

  const totalDone = completedKeySet.size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Workspace</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {edition?.newspaper_name || 'NewsRush'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {edition?.edition_label || 'Edition'} · {totalDone}/19 Done
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.printHeaderBtn}
            onPress={() => navigation.navigate('PrintEdition', { editionId: (edition?.id || editionId) as any })}
          >
            <Text style={styles.printHeaderText}>🖨 Print</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <StatusBadge status={edition?.status || 'draft'} />
        {edition && STATUS_FLOW[edition.status] && (
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={handleAdvanceStatus}
            disabled={advancing}
          >
            {advancing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.advanceBtnText}>{STATUS_BTN[edition.status]}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 4 Page Tab Navigation */}
      <View style={styles.pageTabs}>
        {[1, 2, 3, 4].map((pNum, idx) => {
          const isSelected = activePageIndex === idx;
          const tplKey = templateSelection[pNum] || DEFAULT_TEMPLATE;
          const pageDef = buildPage(pNum, tplKey);
          const pageDoneCount = pageDef.blocks.filter(b => completedKeySet.has(b.section_key)).length;

          return (
            <TouchableOpacity
              key={pNum}
              style={[styles.pageTab, isSelected && styles.pageTabActive]}
              onPress={() => setActivePageIndex(idx)}
            >
              <Text style={[styles.pageTabNum, isSelected && styles.pageTabNumActive]}>
                P{pNum}
              </Text>
              <Text style={[styles.pageTabLabel, isSelected && styles.pageTabLabelActive]} numberOfLines={1}>
                {PAGE_NAMES[idx].split('·')[1]?.trim() || `Page ${pNum}`} ({pageDoneCount}/{pageDef.blocks.length})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Page Content & Templates */}
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Template Selector Box */}
        <View style={styles.templateSection}>
          <Text style={styles.templateHeaderTitle}>CHANGE TEMPLATE</Text>
          <Text style={styles.templateHeaderDesc}>{builtPage.description}</Text>
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
                  <TemplateThumb blocks={previewPage.blocks} completedKeys={completedKeySet} />
                  <Text style={[styles.templateCardName, isCurrent && styles.templateCardNameActive]}>
                    {tpl.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section Cards */}
        {builtPage.blocks.map((block, idx) => {
          const saved = savedSectionsMap.get(block.section_key);
          const headline = saved?.title || '';
          const body = saved?.content || '';
          const isDone = completedKeySet.has(block.section_key);
          const currentChars = body.length;

          return (
            <TouchableOpacity
              key={block.section_key}
              style={[styles.sectionCard, isDone && styles.sectionCardDone]}
              onPress={() =>
                navigation.navigate('SectionEditor', {
                  editionId,
                  pageId: pageNumber,
                  sectionKey: block.section_key,
                  sectionName: block.section_name,
                  initialTitle: headline,
                  initialContent: body,
                  sectionIndex: idx,
                  editionStatus: (edition?.status || 'draft') as any,
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.blockInfo}>
                  <Text style={styles.blockName}>{block.section_name}</Text>
                  <Text style={styles.capacityText}>
                    {currentChars} / {block.charLimit} chars · {block.size.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.statusTag, isDone ? styles.doneTag : styles.draftTag]}>
                  <Text style={[styles.statusTagText, isDone ? styles.doneTagText : styles.draftTagText]}>
                    {isDone ? '✓ Completed' : 'Draft'}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionHeadline} numberOfLines={2}>
                {headline || 'Untitled Article — tap to write'}
              </Text>

              <Text style={styles.sectionBody} numberOfLines={3}>
                {body || 'No text added yet. Use AI Headline & AI Expand to generate news content.'}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.editAction}>Edit Article with AI →</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.navy900,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  headerTitle: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  printHeaderBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  printHeaderText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  statusBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  advanceBtn: {
    backgroundColor: Colors.brand500, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  advanceBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  pageTabs: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pageTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  pageTabActive: {
    borderBottomColor: Colors.brand500, backgroundColor: Colors.brand50,
  },
  pageTabNum: { fontSize: 13, fontWeight: '800', color: Colors.muted },
  pageTabNumActive: { color: Colors.brand500 },
  pageTabLabel: { fontSize: 10, color: Colors.muted, marginTop: 2, fontWeight: '600' },
  pageTabLabelActive: { color: Colors.brand600, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 32 },
  templateSection: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  templateHeaderTitle: {
    fontSize: 11, fontWeight: '800', color: Colors.muted, letterSpacing: 0.5,
  },
  templateHeaderDesc: {
    fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 10,
  },
  templateCardsRow: {
    flexDirection: 'row', gap: 8,
  },
  templateCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, padding: 8, alignItems: 'center',
  },
  templateCardActive: {
    borderColor: Colors.brand500, backgroundColor: Colors.brand50,
  },
  templateCardName: {
    fontSize: 11, fontWeight: '700', color: Colors.muted, marginTop: 6, textAlign: 'center',
  },
  templateCardNameActive: {
    color: Colors.brand600,
  },
  sectionCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.shadow, shadowOpacity: 1, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 2,
  },
  sectionCardDone: {
    borderColor: Colors.successBorder,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 8,
  },
  blockInfo: { flex: 1 },
  blockName: { fontSize: 14, fontWeight: '700', color: Colors.navy900 },
  capacityText: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  statusTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  doneTag: { backgroundColor: Colors.successLight },
  draftTag: { backgroundColor: Colors.navy50 },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  doneTagText: { color: Colors.success },
  draftTagText: { color: Colors.muted },
  sectionHeadline: {
    fontSize: 15, fontWeight: '700', color: Colors.ink,
    lineHeight: 20, marginBottom: 6,
  },
  sectionBody: {
    fontSize: 13, color: Colors.muted, lineHeight: 18,
  },
  cardFooter: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1,
    borderTopColor: Colors.border, flexDirection: 'row', justifyContent: 'flex-end',
  },
  editAction: { fontSize: 13, fontWeight: '700', color: Colors.brand500 },
});
