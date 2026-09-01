import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { saveSection } from '../api/editions';
import { generateHeadline, expandContent } from '../api/ai';
import { RootStackParamList } from '../navigation';

type Route = RouteProp<RootStackParamList, 'SectionEditor'>;

export default function SectionEditorScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const {
    editionId,
    pageId = 1,
    sectionKey = 'main_breaking_news',
    sectionName = 'Section',
    initialTitle = '',
    initialContent = '',
    editionStatus,
  } = route.params;

  const [headline, setHeadline] = useState(initialTitle);
  const [body, setBody] = useState(initialContent);
  const [status, setStatus] = useState<'draft' | 'completed'>(
    initialTitle && initialContent ? 'completed' : 'draft'
  );
  const [saving, setSaving] = useState(false);
  const [aiLoadingH, setAiLoadingH] = useState(false);
  const [aiLoadingB, setAiLoadingB] = useState(false);

  const isReadOnly = editionStatus === 'completed';

  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      await saveSection(editionId, {
        page_number: pageId,
        section_key: sectionKey,
        section_name: sectionName,
        title: headline.trim() || null,
        content: body.trim() || null,
        status,
      });
      if (!silent) {
        Alert.alert('Saved', `"${sectionName}" updated successfully.`);
        navigation.goBack();
      }
    } catch (e: any) {
      if (!silent) {
        Alert.alert('Error', e.message || 'Failed to save section');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAiHeadline = async () => {
    if (!body.trim()) {
      Alert.alert('Content Needed', 'Write some article body text first to generate a headline.');
      return;
    }
    setAiLoadingH(true);
    try {
      const res = await generateHeadline({ content: body.trim() });
      if (res?.headline) {
        setHeadline(res.headline);
      }
    } catch (e: any) {
      Alert.alert('AI Error', e.message || 'Failed to generate headline');
    } finally {
      setAiLoadingH(false);
    }
  };

  const handleAiExpand = async () => {
    if (!body.trim()) {
      Alert.alert('Notes Needed', 'Write a short summary or notes before expanding.');
      return;
    }
    setAiLoadingB(true);
    try {
      const res = await expandContent({ summary: body.trim() });
      if (res?.expanded_content) {
        setBody(res.expanded_content);
      }
      if (res?.generated_title && !headline.trim()) {
        setHeadline(res.generated_title);
      }
      setStatus('completed');
    } catch (e: any) {
      Alert.alert('AI Error', e.message || 'Failed to expand content');
    } finally {
      setAiLoadingB(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sectionName}
          </Text>
          {!isReadOnly && (
            <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(false)} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          {/* Section Info Card */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>
              Page {pageId} · {sectionName}
            </Text>
            <Text style={styles.infoBannerSub}>
              {body.length} characters written
            </Text>
          </View>

          {/* Headline Box */}
          <View style={styles.card}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Headline</Text>
              {!isReadOnly && (
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={handleAiHeadline}
                  disabled={aiLoadingH}
                >
                  {aiLoadingH ? (
                    <ActivityIndicator size="small" color={Colors.brand600} />
                  ) : (
                    <Text style={styles.aiButtonText}>✨ AI Headline</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.input, isReadOnly && styles.readOnly]}
              placeholder="Enter section headline..."
              placeholderTextColor={Colors.textMuted}
              value={headline}
              onChangeText={setHeadline}
              editable={!isReadOnly}
              multiline
            />
          </View>

          {/* Article Body Box */}
          <View style={styles.card}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Article Content</Text>
              {!isReadOnly && (
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={handleAiExpand}
                  disabled={aiLoadingB}
                >
                  {aiLoadingB ? (
                    <ActivityIndicator size="small" color={Colors.brand600} />
                  ) : (
                    <Text style={styles.aiButtonText}>✨ AI Expand</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.bodyInput, isReadOnly && styles.readOnly]}
              placeholder="Write article text, notes, or bullet points..."
              placeholderTextColor={Colors.textMuted}
              value={body}
              onChangeText={setBody}
              editable={!isReadOnly}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Status Selection */}
          {!isReadOnly && (
            <View style={styles.statusRow}>
              <Text style={styles.statusPrompt}>Section Status:</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[styles.statusToggle, status === 'draft' && styles.statusToggleActiveDraft]}
                  onPress={() => setStatus('draft')}
                >
                  <Text style={[styles.statusToggleText, status === 'draft' && styles.statusToggleTextActive]}>
                    Draft
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusToggle, status === 'completed' && styles.statusToggleActiveDone]}
                  onPress={() => setStatus('completed')}
                >
                  <Text style={[styles.statusToggleText, status === 'completed' && styles.statusToggleTextActive]}>
                    ✓ Completed
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.navy900,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#ffffff', fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  saveBtn: {
    backgroundColor: Colors.brand500, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  infoBanner: {
    backgroundColor: Colors.navy50, borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: Colors.border,
  },
  infoBannerTitle: { fontSize: 15, fontWeight: '800', color: Colors.navy900 },
  infoBannerSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.shadow, shadowOpacity: 1, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 2,
  },
  fieldHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand50,
    borderWidth: 1, borderColor: Colors.brand100, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  aiButtonText: { fontSize: 12, fontWeight: '700', color: Colors.brand600 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: Colors.ink, backgroundColor: '#ffffff',
  },
  bodyInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 14,
    color: Colors.ink, backgroundColor: '#ffffff', minHeight: 180,
  },
  readOnly: { backgroundColor: Colors.canvas, color: Colors.muted },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  statusPrompt: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  statusButtons: { flexDirection: 'row', gap: 8 },
  statusToggle: {
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: '#ffffff',
  },
  statusToggleActiveDraft: {
    backgroundColor: Colors.navy900, borderColor: Colors.navy900,
  },
  statusToggleActiveDone: {
    backgroundColor: Colors.success, borderColor: Colors.success,
  },
  statusToggleText: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  statusToggleTextActive: { color: '#ffffff', fontWeight: '700' },
});
