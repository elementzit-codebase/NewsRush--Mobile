import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '../components/CustomAlert';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
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
  Image as ImageIcon,
  Upload,
  RefreshCw,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { normalizeImageUrl } from '../constants/api';
import { saveSection, validateEdition } from '../api/editions';
import { generateHeadline, expandContent, transcribeAudio, searchAiNewsPhoto } from '../api/ai';
import { AiLanguage } from '../types';
import { RootStackParamList } from '../navigation';
import { cleanSectionContent, cleanSectionTitle } from '../lib/contentSanitizer';
import { effectiveCapacityFor, truncateAtSentenceBoundary } from '../lib/capacity';

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
    charLimit: rawBaseCharLimit = 2400,
    initialTitle = '',
    initialContent = '',
    initialStatus,
    editionStatus,
    initialImageUrl = '',
    initialImageCaption = '',
    initialPhotoMode = 'none',
    span = 2,
    isFirstSection = false,
  } = route.params;

  const [customName, setCustomName] = useState(sectionName);
  const [headline, setHeadline] = useState(initialTitle || '');
  const [body, setBody] = useState(initialContent || '');
  const [status, setStatus] = useState<'draft' | 'completed'>(
    initialStatus === 'completed' || (initialTitle && initialContent) ? 'completed' : 'draft'
  );

  const initialLang: AiLanguage =
    ((route.params as any)?.language || 'malayalam').toLowerCase() === 'english'
      ? 'english'
      : 'malayalam';
  const [editionLanguage, setEditionLanguage] = useState<AiLanguage>(initialLang);

  // Photo state (matching NewsRush-FE 3-mode design: 'none' | 'ai' | 'upload')
  const [photoMode, setPhotoMode] = useState<'none' | 'ai' | 'upload'>(
    initialPhotoMode || (initialImageUrl ? 'upload' : 'none')
  );
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || '');
  const [imageCaption, setImageCaption] = useState<string>(initialImageCaption || '');

  const hasActivePhoto = Boolean((photoMode !== 'none' && imageUrl) || photoMode === 'ai');

  const charLimit = effectiveCapacityFor({
    baseCapacity: rawBaseCharLimit,
    span,
    isFirstSection,
    hasPhoto: hasActivePhoto,
  });
  const reducedChars = Math.max(0, rawBaseCharLimit - charLimit);

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

  const handleToggleLanguage = () => {
    setEditionLanguage(prev => (prev === 'malayalam' ? 'english' : 'malayalam'));
  };

  const handleToggleAiPhoto = () => {
    setNotice('');
    if (photoMode === 'ai') {
      setPhotoMode('none');
      setImageUrl('');
      setImageCaption('');
    } else {
      setPhotoMode('ai');
    }
  };

  const [fetchingPhoto, setFetchingPhoto] = useState(false);

  const handleFetchAiPhoto = async () => {
    const query = headline.trim() || body.trim() || customName.trim() || canonicalName;
    if (!query) {
      setNotice('Write or dictate a headline or story summary first to find a relevant photo.');
      return;
    }
    setFetchingPhoto(true);
    setNotice('');
    try {
      const res = await searchAiNewsPhoto(query, editionLanguage);
      if (res?.image_url) {
        setImageUrl(res.image_url);
        setImageCaption(res.image_caption);
        setPhotoMode('ai');
      } else {
        setNotice('No authentic photo found for this topic. You can upload an image.');
      }
    } catch (e: any) {
      setNotice(e.message || 'Failed to search for photo.');
    } finally {
      setFetchingPhoto(false);
    }
  };

  const handlePickImage = async () => {
    setNotice('');
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo Permission',
          'Please allow access to your photos to upload an image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Str = asset.base64;
        if (!base64Str && asset.uri) {
          try {
            base64Str = await LegacyFileSystem.readAsStringAsync(asset.uri, {
              encoding: LegacyFileSystem.EncodingType.Base64,
            });
          } catch (readErr) {
            console.warn('Failed to read image as base64:', readErr);
          }
        }
        const uri = base64Str ? `data:image/jpeg;base64,${base64Str}` : asset.uri;
        setImageUrl(uri);
        setPhotoMode('upload');
        if (!imageCaption.trim()) {
          setImageCaption(
            editionLanguage === 'malayalam' ? 'ചിത്രം: സ്റ്റാഫ് റിപ്പോർട്ടർ' : 'Photo: Staff Reporter'
          );
        }
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to select photo');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoMode('none');
    setImageUrl('');
    setImageCaption('');
  };

  const persistSection = async (nextStatus?: 'draft' | 'completed', closeAfter = false) => {
    setSaving(true);
    setNotice('');
    const finalTitle = cleanSectionTitle(headline.trim(), body.trim());
    const finalBody = cleanSectionContent(body.trim());
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
        image_url: photoMode === 'none' ? null : (imageUrl || null),
        image_caption: photoMode === 'none' ? null : (imageCaption || null),
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
      const res = await generateHeadline({ content: body.trim(), language: editionLanguage });
      if (res?.headline) {
        setHeadline(cleanSectionTitle(res.headline, body.trim()));
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
      const isAiPhoto = photoMode === 'ai';
      const res = await expandContent({
        summary: body.trim(),
        character_limit: charLimit,
        language: editionLanguage,
        include_photo: isAiPhoto,
      });
      if (res?.expanded_content) {
        const cleaned = cleanSectionContent(res.expanded_content);
        const fitted = truncateAtSentenceBoundary(cleaned, charLimit, editionLanguage);
        if (!fitted) {
          setNotice('The generated copy has no complete sentence within this section’s print capacity.');
        } else {
          setBody(fitted);
          if (fitted.length < cleaned.length) {
            setNotice('Generated copy was limited at a complete sentence to fit the print capacity.');
          }
        }
      }
      if (res?.generated_title && !headline.trim()) {
        setHeadline(cleanSectionTitle(res.generated_title, res.expanded_content || ''));
      }
      if (isAiPhoto && res?.image_url) {
        setImageUrl(res.image_url);
        if (res.image_caption) {
          setImageCaption(res.image_caption);
        }
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

      let base64Audio: string | undefined;
      try {
        base64Audio = await readAudioUriAsBase64(uri);
      } catch (readErr) {
        console.warn('Could not read audio file as base64:', readErr);
      }

      const result = await transcribeAudio({
        audio_uri: uri,
        audio_b64: base64Audio,
        mime_type: mimeType,
        language: editionLanguage,
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
    setNotice('');
    const rawMerged = body.trim() ? `${body.trim()} ${voiceDraft.trim()}` : voiceDraft.trim();
    const merged = truncateAtSentenceBoundary(rawMerged, charLimit, editionLanguage);
    if (!merged && rawMerged.length > charLimit) {
      setNotice('No complete sentence fits this section. Shorten the copy or remove the photo.');
      return;
    }
    setBody(merged || rawMerged.slice(0, charLimit));
    if (merged && merged.length < rawMerged.length) {
      setNotice('Voice text was limited at a complete sentence to fit the print capacity.');
    }
    setVoiceDraft('');
  };

  const waveBars = [0.4, 0.85, 0.55, 1.0, 0.65, 0.9, 0.45, 0.75, 0.6, 0.35];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Section Label Header & Input */}
          <View style={styles.metaCard}>
            <View style={styles.sectionLabelHeader}>
              <View style={styles.sectionLabelTitleRow}>
                <Text style={styles.smallLabel}>Section label</Text>
                <TouchableOpacity
                  style={styles.langBadgePill}
                  onPress={handleToggleLanguage}
                  activeOpacity={0.7}
                  disabled={isReadOnly}
                  accessibilityLabel="Toggle content language"
                >
                  <Text style={styles.langBadgePillText}>
                    {editionLanguage === 'malayalam' ? 'മലയാളം' : 'English'}
                  </Text>
                </TouchableOpacity>
              </View>
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

          {/* Section Photo Module (matching NewsRush-FE) */}
          <View style={styles.card}>
            <View style={styles.fieldHeader}>
              <View style={styles.photoHeaderLeft}>
                <View style={styles.photoIconWrap}>
                  <ImageIcon size={15} color={Colors.brand600} strokeWidth={2.2} />
                </View>
                <Text style={styles.fieldLabel}>Section Photo</Text>
              </View>
              {hasActivePhoto ? (
                <View style={styles.photoActiveBadge}>
                  <Text style={styles.photoActiveBadgeText}>
                    {photoMode === 'upload' ? 'Uploaded' : 'AI Active'}
                  </Text>
                </View>
              ) : (
                <View style={styles.photoOptionalBadge}>
                  <Text style={styles.photoOptionalBadgeText}>Optional</Text>
                </View>
              )}
            </View>

            {/* Photo Action Buttons: AI Photo toggle & Device Upload */}
            {!isReadOnly && (
              <View style={styles.photoActionsGrid}>
                {/* AI Photo Toggle */}
                <TouchableOpacity
                  style={[
                    styles.photoActionCard,
                    photoMode === 'ai' && styles.photoActionCardActive,
                  ]}
                  onPress={handleToggleAiPhoto}
                  activeOpacity={0.8}
                >
                  <View style={styles.photoActionInner}>
                    <Sparkles
                      size={14}
                      color={photoMode === 'ai' ? Colors.brand600 : Colors.muted}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.photoActionText,
                        photoMode === 'ai' && styles.photoActionTextActive,
                      ]}
                    >
                      AI Photo
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggleTrack,
                      photoMode === 'ai' && styles.toggleTrackActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        photoMode === 'ai' && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Upload Photo Button */}
                <TouchableOpacity
                  style={styles.photoActionCard}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <View style={styles.photoActionInner}>
                    <Upload size={14} color={Colors.muted} strokeWidth={2} />
                    <Text style={styles.photoActionText}>Upload</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Helper Notice when AI photo is enabled but no image loaded yet */}
            {photoMode === 'ai' && !imageUrl && (
              <View style={styles.aiPhotoNoticeBox}>
                <View style={styles.aiPhotoNoticeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={12} color={Colors.brand600} />
                    <Text style={styles.aiPhotoNoticeTitle}>AI Search Ready</Text>
                  </View>
                  {reducedChars > 0 && (
                    <Text style={styles.aiPhotoNoticeChars}>-{reducedChars} chars</Text>
                  )}
                </View>
                <Text style={styles.aiPhotoNoticeSub}>
                  Tap <Text style={{ fontWeight: '700' }}>Expand to fit</Text> below to generate and attach an authentic news photo, or find one right now:
                </Text>
                <TouchableOpacity
                  style={styles.findPhotoNowBtn}
                  onPress={handleFetchAiPhoto}
                  disabled={fetchingPhoto}
                  activeOpacity={0.8}
                >
                  {fetchingPhoto ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Sparkles size={13} color="#ffffff" />
                      <Text style={styles.findPhotoNowBtnText}>Find Photo with AI Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Active Photo State: Thumbnail, Caption, Remove */}
            {hasActivePhoto && Boolean(imageUrl) && (
              <View style={styles.activePhotoSection}>
                <View style={styles.activePhotoRow}>
                  {/* Photo Preview Thumbnail */}
                  <View style={styles.photoThumbWrap}>
                    <RNImage
                      source={{ uri: normalizeImageUrl(imageUrl) }}
                      style={styles.photoThumbImg}
                      resizeMode="cover"
                      onError={(e) => console.warn('SectionEditor photo load error:', e.nativeEvent.error)}
                    />
                    {photoMode === 'ai' && (
                      <View style={styles.photoAiTag}>
                        <Text style={styles.photoAiTagText}>AI</Text>
                      </View>
                    )}
                  </View>

                  {/* Caption & Controls */}
                  <View style={styles.photoCaptionWrap}>
                    <View style={styles.photoCaptionHeader}>
                      <Text style={styles.photoCaptionLabel}>Caption / Credit</Text>
                      {!isReadOnly && (
                        <View style={styles.photoControlBtns}>
                          {photoMode === 'ai' && (
                            <TouchableOpacity
                              style={styles.photoRefetchBtn}
                              onPress={handleAiExpand}
                              disabled={aiLoadingB}
                            >
                              <RefreshCw size={11} color={Colors.brand600} />
                              <Text style={styles.photoRefetchText}>Refetch</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.photoRemoveBtn}
                            onPress={handleRemovePhoto}
                          >
                            <Trash2 size={11} color={Colors.error} />
                            <Text style={styles.photoRemoveText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.photoCaptionInput}
                      value={imageCaption}
                      onChangeText={setImageCaption}
                      placeholder={
                        editionLanguage === 'malayalam'
                          ? 'ഉദാ: ചിത്രം: ലേഖകൻ'
                          : 'e.g., Photo: Staff Reporter'
                      }
                      placeholderTextColor={Colors.textMuted}
                      editable={!isReadOnly}
                    />
                  </View>
                </View>

                {/* Capacity subtraction indicator */}
                <View style={styles.photoCapacityBox}>
                  <Text style={styles.photoCapacityText}>
                    Capacity: {charLimit} chars
                  </Text>
                  {reducedChars > 0 && (
                    <Text style={styles.photoCapacityDelta}>
                      -{reducedChars} chars for layout
                    </Text>
                  )}
                </View>
              </View>
            )}
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
                editionLanguage === 'malayalam'
                  ? 'വാർത്തയുടെ കുറിപ്പുകൾ എഴുതുക അല്ലെങ്കിൽ താഴെയുള്ള മൈക്ക് അമർത്തി സംസാരിക്കുക...'
                  : 'Type section body or bullet points, or record voice below...'
              }
              placeholderTextColor={Colors.textMuted}
              value={body}
              onChangeText={t => setBody(t)}
              onBlur={() => {
                if (body.length > charLimit) {
                  const fitted = truncateAtSentenceBoundary(body, charLimit, editionLanguage);
                  if (fitted) {
                    setBody(fitted);
                    setNotice('Text was limited at a complete sentence to fit the print capacity.');
                  } else {
                    setNotice('No complete sentence fits this section. Shorten the copy or remove the photo.');
                  }
                }
              }}
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
                    {editionLanguage === 'malayalam' ? 'ML' : 'EN'}
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
                  Transcribing {editionLanguage === 'malayalam' ? 'Malayalam' : 'English'} audio with AI…
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
                  {body.length}/{charLimit} chars fit printed box{hasActivePhoto ? ' (photo capacity)' : ''}
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
  scrollContent: { padding: 12, paddingBottom: 220 },
  metaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBadgePill: {
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  langBadgePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.brand600,
    letterSpacing: 0.2,
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
  recordingCard: {
    marginTop: 10,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTranscriptBox: {
    width: '100%',
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  liveTranscriptText: {
    fontSize: 13,
    lineHeight: 19,
  },
  liveTranscriptSettled: {
    color: Colors.navy900,
    fontWeight: '500',
  },
  liveTranscriptInterim: {
    color: Colors.error,
    fontStyle: 'italic',
    fontWeight: '600',
  },
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

  /* Section Photo Module Styles */
  photoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Colors.brand50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActiveBadge: {
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  photoActiveBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.brand600,
  },
  photoOptionalBadge: {
    backgroundColor: Colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  photoOptionalBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.muted,
  },
  photoActionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  photoActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.canvas,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  photoActionCardActive: {
    borderColor: Colors.brand500,
    backgroundColor: Colors.brand50,
  },
  photoActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  photoActionTextActive: {
    color: Colors.brand600,
    fontWeight: '700',
  },
  toggleTrack: {
    width: 28,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: Colors.brand500,
  },
  toggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  aiPhotoNoticeBox: {
    marginTop: 8,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    borderRadius: 10,
    padding: 10,
  },
  aiPhotoNoticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiPhotoNoticeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.brand600,
  },
  aiPhotoNoticeChars: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.brand600,
    backgroundColor: Colors.brand100,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiPhotoNoticeSub: {
    marginTop: 4,
    fontSize: 11.5,
    color: Colors.ink,
    lineHeight: 16,
  },
  findPhotoNowBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.brand600,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  findPhotoNowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  activePhotoSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  activePhotoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  photoThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.canvas,
    position: 'relative',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoAiTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.brand600,
    paddingVertical: 1,
    alignItems: 'center',
  },
  photoAiTagText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  photoCaptionWrap: {
    flex: 1,
    minWidth: 0,
  },
  photoCaptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  photoCaptionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  photoControlBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoRefetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  photoRefetchText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.brand600,
  },
  photoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  photoRemoveText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  photoCaptionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: Colors.ink,
    backgroundColor: Colors.canvas,
    height: 32,
  },
  photoCapacityBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoCapacityText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brand600,
  },
  photoCapacityDelta: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.brand600,
  },
});
