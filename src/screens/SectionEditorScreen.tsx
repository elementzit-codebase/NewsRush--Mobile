import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { updateSection, generateAiHeadline, aiExpandSection, uploadSectionImage } from '../api/editions';
import { RootStackParamList } from '../navigation';

type Route = RouteProp<RootStackParamList, 'SectionEditor'>;

export default function SectionEditorScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { editionId, pageId, sectionId, sectionIndex, editionStatus } = route.params;

  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoadingH, setAiLoadingH] = useState(false);
  const [aiLoadingB, setAiLoadingB] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const isReadOnly = editionStatus === 'completed';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSection(editionId, pageId, sectionId, { headline, body });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAiHeadline = async () => {
    setAiLoadingH(true);
    try {
      const res = await generateAiHeadline(editionId, pageId, sectionId);
      setHeadline(res.headline);
    } catch (e: any) {
      Alert.alert('AI Error', e.message || 'Failed to generate headline');
    } finally {
      setAiLoadingH(false);
    }
  };

  const handleAiExpand = async () => {
    if (!body.trim()) { Alert.alert('Write something first', 'Add some body text before expanding.'); return; }
    setAiLoadingB(true);
    try {
      const res = await aiExpandSection(editionId, pageId, sectionId);
      setBody(res.body);
    } catch (e: any) {
      Alert.alert('AI Error', e.message || 'Failed to expand');
    } finally {
      setAiLoadingB(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setUploadingImg(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('image', { uri: asset.uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
      await uploadSectionImage(editionId, pageId, sectionId, formData);
      Alert.alert('Success', 'Image uploaded');
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setUploadingImg(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Section {sectionIndex + 1}</Text>
        {!isReadOnly && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.fieldCard}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>Headline</Text>
            {!isReadOnly && (
              <TouchableOpacity style={styles.aiBtnSmall} onPress={handleAiHeadline} disabled={aiLoadingH}>
                {aiLoadingH ? <ActivityIndicator size="small" color={Colors.primary} /> :
                  <Text style={styles.aiSmallText}>✨ AI Headline</Text>}
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={[styles.input, isReadOnly && styles.inputReadOnly]}
            placeholder="Enter headline..."
            placeholderTextColor={Colors.textMuted}
            value={headline}
            onChangeText={setHeadline}
            editable={!isReadOnly}
            multiline
          />
        </View>

        <View style={styles.fieldCard}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>Body</Text>
            {!isReadOnly && (
              <TouchableOpacity style={styles.aiBtnSmall} onPress={handleAiExpand} disabled={aiLoadingB}>
                {aiLoadingB ? <ActivityIndicator size="small" color={Colors.primary} /> :
                  <Text style={styles.aiSmallText}>✨ Expand</Text>}
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={[styles.bodyInput, isReadOnly && styles.inputReadOnly]}
            placeholder="Write article content..."
            placeholderTextColor={Colors.textMuted}
            value={body}
            onChangeText={setBody}
            editable={!isReadOnly}
            multiline
            textAlignVertical="top"
          />
        </View>

        {!isReadOnly && (
          <View style={styles.toolRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={handlePickImage} disabled={uploadingImg}>
              {uploadingImg ? <ActivityIndicator color={Colors.primary} size="small" /> :
                <><Text style={styles.toolIcon}>📷</Text><Text style={styles.toolText}>Add Image</Text></>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backText: { color: '#fff', fontSize: 18, fontWeight: '600', marginRight: 12 },
  headerTitle: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 16 },
  saveBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  scroll: { flex: 1, backgroundColor: Colors.background },
  fieldCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  aiBtnSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  aiSmallText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
  bodyInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
    minHeight: 160,
  },
  inputReadOnly: { backgroundColor: Colors.borderLight, color: Colors.textSecondary },
  toolRow: { flexDirection: 'row', gap: 12 },
  toolBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, gap: 8,
  },
  toolIcon: { fontSize: 20 },
  toolText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});
