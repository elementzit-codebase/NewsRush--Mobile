import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import {
  ChevronLeft,
  Save,
  Sparkles,
  Mic,
  Square,
  Trash2,
  Check,
  Pencil,
  RotateCcw,
  Languages,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { saveSection, validateEdition } from '../api/editions';
import { generateHeadline, expandContent, transcribeAudio } from '../api/ai';
import { AiLanguage } from '../types';
import { RootStackParamList } from '../navigation';

type Route = RouteProp<RootStackParamList, 'SectionEditor'>;

async function readAudioUriAsBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    if (typeof (file as any).base64 === 'function') {
      return await (file as any).base64();
    }
  } catch {}
  return await LegacyFileSystem.readAsStringAsync(uri, {
    encoding: LegacyFileSystem.EncodingType.Base64,
  });
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SectionEditorScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const {
    editionId,
    pageId = 1,
    sectionKey = 'main_breaking_news',
    sectionName = 'Section',
    canonicalName = sectionName,
    charLimit = 2400,
    initialTitle = '',
    initialContent = '',
    initialStatus,
    editionStatus,
  } = route.params;

  const [customName, setCustomName] = useState(sectionName);
  const [headline, setHeadline] = useState(initialTitle);
  const [body, setBody] = useState(initialContent);
  const [status, setStatus] = useState<'draft' | 'completed'>(
    initialStatus === 'completed' || (initialTitle && initialContent) ? 'completed' : 'draft'
  );
  const [language, setLanguage] = useState<AiLanguage>('english');

  const [saving, setSaving] = useState(false);
  const [aiLoadingH, setAiLoadingH] = useState(false);
  const [aiLoadingB, setAiLoadingB] = useState(false);
  const [notice, setNotice] = useState('');

  // Voice recording state (3-state UI matching NewsRush-FE) using expo-audio
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerIntervalRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');

  const isReadOnly = editionStatus === 'completed';
  const nameIsCustom = customName.trim() !== '' && customName.trim() !== canonicalName;

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const persistSection = async (nextStatus?: 'draft' | 'completed', closeAfter = false) => {
    setSaving(true);
    setNotice('');
    const finalTitle = headline.trim();
    const finalBody = body.trim();
    const resolvedStatus =
      nextStatus || (finalTitle && finalBody ? status : 'draft');

    try {
      await saveSection(editionId, {
        page_number: pageId,
        section_key: sectionKey,
        section_name: customName.trim() || canonicalName,
        title: finalTitle || null,
        content: finalBody || null,
        status: resolvedStatus,
      });
      // Keep edition readiness status in sync on server
      validateEdition(editionId).catch(() => {});
      setStatus(resolvedStatus);
      if (closeAfter) {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Save Error', e.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    const next = status === 'completed' ? 'draft' : 'completed';
    if (next === 'completed' && (!headline.trim() || !body.trim())) {
      setNotice('Add both a headline and body text before marking this section complete.');
      return;
    }
    await persistSection(next, false);
  };

  const handleAiHeadline = async () => {
    if (!body.trim()) {
      setNotice('Write or dictate some article body text first to generate a headline.');
      return;
    }
    setNotice('');
    setAiLoadingH(true);
    try {
      const res = await generateHeadline({ content: body.trim(), language });
      if (res?.headline) {
        setHeadline(res.headline);
      }
    } catch (e: any) {
      setNotice(e.message || 'Failed to generate headline.');
    } finally {
      setAiLoadingH(false);
    }
  };

  const handleAiExpand = async () => {
    if (!body.trim()) {
      setNotice('Write or dictate a short summary before expanding.');
      return;
    }
    setNotice('');
    setAiLoadingB(true);
    try {
      const res = await expandContent({
        summary: body.trim(),
        character_limit: charLimit,
        language,
      });
      if (res?.expanded_content) {
        setBody(res.expanded_content);
      }
      if (res?.generated_title && !headline.trim()) {
        setHeadline(res.generated_title);
      }
      setStatus('completed');
    } catch (e: any) {
      setNotice(e.message || 'Failed to expand content.');
    } finally {
      setAiLoadingB(false);
    }
  };

  /* ------------------------------------------------ Voice Input Handlers */

  const handleStartRecording = async () => {
    if (isRecording || transcribing) return;
    setNotice('');
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Microphone Permission',
          'Please allow microphone access to dictate news stories.'
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setVoiceDraft('');
      setElapsedSec(0);
      setIsRecording(true);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSec(s => s + 1);
      }, 1000);
    } catch (err: any) {
      setNotice(err.message || 'Could not start audio recording.');
    }
  };

  const handleCancelRecording = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
    setElapsedSec(0);
    setVoiceDraft('');
    try {
      await audioRecorder.stop();
    } catch {}
  };

  const handleStopAndTranscribe = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);

    setTranscribing(true);
    setNotice('');
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = audioRecorder.uri;
      if (!uri) {
        throw new Error('No audio file was recorded.');
      }

      let b64 = '';
      try {
        b64 = await readAudioUriAsBase64(uri);
      } catch {}

      const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
      const mimeMap: Record<string, string> = {
        m4a: 'audio/mp4',
        mp4: 'audio/mp4',
        aac: 'audio/aac',
        wav: 'audio/wav',
        caf: 'audio/x-caf',
        webm: 'audio/webm',
        '3gp': 'audio/3gpp',
      };
      const mimeType = mimeMap[ext] || 'audio/mp4';

      const result = await transcribeAudio({
        audio_b64: b64 || undefined,
        audio_uri: uri,
        mime_type: mimeType,
        language,
      });

      if (result?.transcript) {
        setVoiceDraft(result.transcript.trim());
      } else {
        setNotice('No speech detected. Please try speaking again.');
      }
    } catch (err: any) {
      setNotice(err.message || 'Transcription failed. Please try again.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleDiscardVoice = () => {
    setVoiceDraft('');
  };

  const handleApplyVoice = () => {
    if (!voiceDraft.trim()) return;
    const merged = (body.trim() ? `${body.trim()} ${voiceDraft.trim()}` : voiceDraft.trim()).slice(
      0,
      charLimit
    );
    setBody(merged);
    setVoiceDraft('');
  };

  const waveBars = [0.4, 0.85, 0.55, 1.0, 0.65, 0.9, 0.45, 0.75, 0.6, 0.35];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={18} color="#ffffff" strokeWidth={2.2} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {customName || canonicalName}
            </Text>
            <Text style={styles.headerSub}>
              Page {pageId} · {body.length}/{charLimit} chars
            </Text>
          </View>

          {!isReadOnly && (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => persistSection(undefined, true)}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Save size={13} color="#ffffff" strokeWidth={2.2} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Language & Section Label Row */}
          <View style={styles.metaCard}>
            <View style={styles.langRow}>
              <View style={styles.langLabelWrap}>
                <Languages size={15} color={Colors.brand500} strokeWidth={2} />
                <Text style={styles.langLabel}>AI & Voice Language</Text>
              </View>
              <View style={styles.langToggleGroup}>
                <TouchableOpacity
                  style={[
                    styles.langPill,
                    language === 'english' && styles.langPillActive,
                  ]}
                  onPress={() => setLanguage('english')}
                >
                  <Text
                    style={[
                      styles.langPillText,
                      language === 'english' && styles.langPillTextActive,
                    ]}
                  >
                    English
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langPill,
                    language === 'malayalam' && styles.langPillActive,
                  ]}
                  onPress={() => setLanguage('malayalam')}
                >
                  <Text
                    style={[
                      styles.langPillText,
                      language === 'malayalam' && styles.langPillTextActive,
                    ]}
                  >
                    മലയാളം
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Section Label Input */}
            <View style={styles.sectionLabelHeader}>
              <Text style={styles.smallLabel}>Section label</Text>
              {nameIsCustom && !isReadOnly && (
                <TouchableOpacity
                  style={styles.resetNameBtn}
                  onPress={() => setCustomName(canonicalName)}
                >
                  <RotateCcw size={11} color={Colors.brand600} strokeWidth={2} />
                  <Text style={styles.resetNameText}>Reset to “{canonicalName}”</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.sectionLabelInputWrap}>
              <Pencil size={14} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.sectionLabelInput}
                value={customName}
                onChangeText={t => setCustomName(t.slice(0, 60))}
                editable={!isReadOnly}
                placeholder={canonicalName}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {/* Headline Card */}
          <View style={styles.card}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Headline</Text>
              {!isReadOnly && (
                <TouchableOpacity
                  style={styles.aiChipBtn}
                  onPress={handleAiHeadline}
                  disabled={aiLoadingH || aiLoadingB}
                >
                  {aiLoadingH ? (
                    <ActivityIndicator size="small" color={Colors.brand600} />
                  ) : (
                    <>
                      <Sparkles size={13} color={Colors.brand600} strokeWidth={2} />
                      <Text style={styles.aiChipText}>Write headline</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.headlineInput, isReadOnly && styles.readOnly]}
              placeholder="Type or generate a headline"
              placeholderTextColor={Colors.textMuted}
              value={headline}
              onChangeText={setHeadline}
              editable={!isReadOnly}
              multiline
            />
          </View>

          {/* Unified Body Text & Voice Dictation Card (matching NewsRush-FE) */}
          <View style={styles.card}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Article Body & Voice Dictation</Text>
              {!isReadOnly && (
                <TouchableOpacity
                  style={[styles.aiChipBtn, styles.aiExpandChip]}
                  onPress={handleAiExpand}
                  disabled={aiLoadingB || aiLoadingH}
                >
                  {aiLoadingB ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Sparkles size={13} color="#ffffff" strokeWidth={2} />
                      <Text style={[styles.aiChipText, { color: '#ffffff' }]}>
                        Expand to fit
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[styles.bodyInput, isReadOnly && styles.readOnly]}
              placeholder={
                language === 'malayalam'
                  ? 'വാർത്തയുടെ കുറിപ്പുകൾ എഴുതുക അല്ലെങ്കിൽ താഴെയുള്ള മൈക്ക് അമർത്തി സംസാരിക്കുക...'
                  : 'Type section body or bullet points, or record voice below...'
              }
              placeholderTextColor={Colors.textMuted}
              value={body}
              onChangeText={t => setBody(t.slice(0, charLimit))}
              editable={!isReadOnly}
              multiline
              textAlignVertical="top"
            />

            {/* --- 1. ACTIVE RECORDING STATE --- */}
            {isRecording && (
              <View style={styles.recordingBar}>
                <View style={styles.recordingLeft}>
                  <View style={styles.redDot} />
                  <Text style={styles.recordingTimer}>{formatSeconds(elapsedSec)}</Text>
                  <View style={styles.waveRow}>
                    {waveBars.map((ratio, i) => {
                      const activeRatio =
                        ((elapsedSec + i) % 3 === 0 ? ratio : ratio * 0.55);
                      return (
                        <View
                          key={i}
                          style={[
                            styles.waveBar,
                            { height: Math.max(4, Math.round(activeRatio * 18)) },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.recordingLangHint}>
                    {language === 'malayalam' ? 'ML' : 'EN'}
                  </Text>
                </View>

                <View style={styles.recordingActions}>
                  <TouchableOpacity
                    style={styles.cancelRecBtn}
                    onPress={handleCancelRecording}
                    accessibilityLabel="Cancel recording"
                  >
                    <Trash2 size={15} color={Colors.error} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stopRecBtn}
                    onPress={handleStopAndTranscribe}
                    accessibilityLabel="Stop and transcribe"
                  >
                    <Square size={14} color="#ffffff" fill="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* --- TRANSCRIBING INDICATOR --- */}
            {transcribing && (
              <View style={styles.transcribingBar}>
                <ActivityIndicator size="small" color={Colors.brand500} />
                <Text style={styles.transcribingText}>
                  Transcribing {language === 'malayalam' ? 'Malayalam' : 'English'} audio with AI…
                </Text>
              </View>
            )}

            {/* --- 2. REVIEW & DECIDE STATE (APPLY OR DELETE) --- */}
            {!isRecording && !transcribing && voiceDraft.trim().length > 0 && (
              <View style={styles.reviewVoiceBox}>
                <View style={styles.reviewVoiceHeader}>
                  <View style={styles.reviewVoiceTitleRow}>
                    <Mic size={14} color={Colors.brand600} strokeWidth={2.2} />
                    <Text style={styles.reviewVoiceTitle}>Recorded Voice</Text>
                  </View>
                  <Text style={styles.reviewVoiceChars}>{voiceDraft.length} chars</Text>
                </View>

                <TextInput
                  style={styles.reviewVoiceInput}
                  value={voiceDraft}
                  onChangeText={setVoiceDraft}
                  multiline
                  placeholder="Transcribed text"
                  placeholderTextColor={Colors.textMuted}
                />

                <View style={styles.reviewVoiceActions}>
                  <TouchableOpacity
                    style={styles.discardVoiceBtn}
                    onPress={handleDiscardVoice}
                  >
                    <Trash2 size={13} color={Colors.error} strokeWidth={2} />
                    <Text style={styles.discardVoiceText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyVoiceBtn}
                    onPress={handleApplyVoice}
                  >
                    <Check size={14} color="#ffffff" strokeWidth={2.5} />
                    <Text style={styles.applyVoiceText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* --- 3. IDLE BOTTOM ACTION BAR --- */}
            {!isRecording && !transcribing && !voiceDraft.trim() && (
              <View style={styles.idleVoiceBar}>
                <Text
                  style={[
                    styles.charCounter,
                    body.length >= charLimit && { color: Colors.warning, fontWeight: '700' },
                  ]}
                >
                  {body.length}/{charLimit} chars fit printed box
                </Text>

                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.micStartBtn}
                    onPress={handleStartRecording}
                    activeOpacity={0.85}
                    accessibilityLabel="Start voice dictation"
                  >
                    <Mic size={16} color="#ffffff" strokeWidth={2.2} />
                    <Text style={styles.micStartText}>Dictate</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {notice ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {/* Mark Complete / Reopen as Draft Button */}
          {!isReadOnly && (
            <TouchableOpacity
              style={[
                styles.completeToggleBtn,
                status === 'completed'
                  ? styles.completeToggleReopen
                  : styles.completeToggleMark,
              ]}
              onPress={handleToggleComplete}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Check
                size={16}
                color={status === 'completed' ? Colors.ink : '#ffffff'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.completeToggleText,
                  status === 'completed' ? { color: Colors.ink } : { color: '#ffffff' },
                ]}
              >
                {status === 'completed' ? 'Reopen as draft' : 'Mark section complete'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.brand500,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 160 },
  metaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  langLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  langToggleGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.navy50,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  langPill: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langPillActive: {
    backgroundColor: Colors.brand500,
  },
  langPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.muted,
  },
  langPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sectionLabelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  smallLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.muted,
  },
  resetNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetNameText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.brand600,
  },
  sectionLabelInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: Colors.canvas,
  },
  sectionLabelInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.navy900,
    paddingVertical: 0,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.ink },
  aiChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand500,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  aiExpandChip: {
    backgroundColor: Colors.brand500,
    borderColor: Colors.brand500,
  },
  aiChipText: { fontSize: 11.5, fontWeight: '700', color: Colors.brand600 },
  headlineInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    backgroundColor: '#ffffff',
    minHeight: 42,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.ink,
    backgroundColor: '#ffffff',
    minHeight: 150,
  },
  readOnly: { backgroundColor: Colors.canvas, color: Colors.muted },

  /* Voice Recording States */
  recordingBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  redDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.error,
  },
  recordingTimer: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.error,
    fontVariant: ['tabular-nums'],
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    height: 20,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.error,
  },
  recordingLangHint: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.error,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelRecBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopRecBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcribingBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  transcribingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.brand600,
  },
  reviewVoiceBox: {
    marginTop: 10,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    borderRadius: 10,
    padding: 10,
  },
  reviewVoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewVoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reviewVoiceTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy900,
  },
  reviewVoiceChars: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
  },
  reviewVoiceInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.brand100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: Colors.navy900,
    minHeight: 54,
    textAlignVertical: 'top',
  },
  reviewVoiceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  discardVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discardVoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  applyVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  applyVoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  idleVoiceBar: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCounter: {
    fontSize: 12,
    color: Colors.muted,
  },
  micStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.brand500,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  micStartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  noticeBox: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  noticeText: {
    fontSize: 12.5,
    color: '#92400e',
    fontWeight: '500',
  },
  completeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    height: 42,
  },
  completeToggleMark: {
    backgroundColor: Colors.navy900,
  },
  completeToggleReopen: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completeToggleText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
