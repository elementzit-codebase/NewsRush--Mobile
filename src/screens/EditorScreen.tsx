import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { Edition, Page } from '../types';
import { getEdition, updateEditionStatus, checkReadiness } from '../api/editions';
import StatusBadge from '../components/StatusBadge';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Editor'>;

const PAGE_LABELS = ['Front Page', 'Page 2', 'Page 3', 'Back Page'];
const STATUS_FLOW: Record<string, string> = {
  draft: 'in_progress', in_progress: 'ready', ready: 'completed',
};
const STATUS_BTN: Record<string, string> = {
  draft: 'Start Working', in_progress: 'Mark Ready', ready: 'Complete',
};

export default function EditorScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { editionId } = route.params;
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(0);
  const [advancing, setAdvancing] = useState(false);

  const load = async () => {
    try {
      const data = await getEdition(editionId);
      setEdition(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdvanceStatus = async () => {
    if (!edition) return;
    const next = STATUS_FLOW[edition.status];
    if (!next) return;
    if (edition.status === 'in_progress') {
      setAdvancing(true);
      try {
        const res = await checkReadiness(editionId);
        if (!res.passed) {
          Alert.alert('Not Ready', 'Issues found:\n' + res.issues.join('\n'));
          setAdvancing(false);
          return;
        }
      } catch {}
      setAdvancing(false);
    }
    Alert.alert('Update Status', `Move to "${next.replace('_', ' ')}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try {
          const updated = await updateEditionStatus(editionId, next as any);
          setEdition(updated);
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const page: Page | undefined = edition?.pages[activePage];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{edition?.title}</Text>
          {edition && <StatusBadge status={edition.status} />}
        </View>
        {edition && STATUS_FLOW[edition.status] && (
          <TouchableOpacity style={styles.advanceBtn} onPress={handleAdvanceStatus} disabled={advancing}>
            {advancing ? <ActivityIndicator color="#fff" size="small" /> :
              <Text style={styles.advanceBtnText}>{STATUS_BTN[edition.status]}</Text>}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pageTabs}>
        {PAGE_LABELS.map((label, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.pageTab, activePage === idx && styles.pageTabActive]}
            onPress={() => setActivePage(idx)}
          >
            <Text style={[styles.pageTabText, activePage === idx && styles.pageTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {page?.sections?.map((section, idx) => (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionCard}
            onPress={() => navigation.navigate('SectionEditor', {
              editionId, pageId: page.id, sectionId: section.id,
              sectionIndex: idx, editionStatus: edition!.status,
            })}
            activeOpacity={0.85}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNum}>
                <Text style={styles.sectionNumText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeadline} numberOfLines={2}>
                  {section.headline || 'Untitled section — tap to edit'}
                </Text>
                {section.isAiGenerated && (
                  <View style={styles.aiBadge}><Text style={styles.aiText}>✨ AI</Text></View>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
            {section.body ? (
              <Text style={styles.sectionBody} numberOfLines={2}>{section.body}</Text>
            ) : (
              <Text style={styles.sectionEmpty}>Tap to add content</Text>
            )}
            {(section.imageUrl || section.voiceNoteUrl) && (
              <View style={styles.attachments}>
                {section.imageUrl && <Text style={styles.attachTag}>📷 Image</Text>}
                {section.voiceNoteUrl && <Text style={styles.attachTag}>🎙 Voice</Text>}
              </View>
            )}
          </TouchableOpacity>
        ))}
        {(!page?.sections || page.sections.length === 0) && (
          <View style={styles.emptyPage}>
            <Text style={styles.emptyPageText}>No sections on this page</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  advanceBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  advanceBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  pageTabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  pageTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  pageTabText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  pageTabTextActive: { color: Colors.primary, fontWeight: '700' },
  scroll: { padding: 12 },
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: Colors.shadow, shadowOpacity: 1,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  sectionNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionNumText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  sectionHeadline: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  aiBadge: { backgroundColor: Colors.infoLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, marginTop: 4, alignSelf: 'flex-start' },
  aiText: { fontSize: 10, color: Colors.info, fontWeight: '600' },
  chevron: { fontSize: 20, color: Colors.textMuted },
  sectionBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  sectionEmpty: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  attachments: { flexDirection: 'row', gap: 8, marginTop: 8 },
  attachTag: { fontSize: 11, color: Colors.textSecondary, backgroundColor: Colors.borderLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  emptyPage: { alignItems: 'center', marginTop: 60 },
  emptyPageText: { color: Colors.textMuted, fontSize: 15 },
});
