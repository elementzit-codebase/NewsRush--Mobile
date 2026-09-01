import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../constants/colors';
import { Edition } from '../types';
import { getEdition, updateEditionStatus } from '../api/editions';
import { buildPage, DEFAULT_TEMPLATE } from '../data/templates';
import { readTemplates } from '../lib/templateStore';
import { RootStackParamList } from '../navigation';

type Route = RouteProp<RootStackParamList, 'PrintEdition'>;

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
      setEdition(prev => prev ? { ...prev, status: updated.status } : updated);
      Alert.alert('Status Updated', 'Edition is marked as Completed.');
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

  const generateHtml = () => {
    const allPagesHtml = [1, 2, 3, 4].map(pNum => {
      const tplKey = templateSelection[pNum] || DEFAULT_TEMPLATE;
      const pageLayout = buildPage(pNum, tplKey);
      return `
        <div class="sheet ${pNum < 4 ? 'page-break' : ''}">
          <div class="masthead">
            <div class="newspaper-name">${edition?.newspaper_name || 'NEWSRUSH'}</div>
            <div class="meta-bar">
              <span>${edition?.edition_label || 'Daily Edition'}</span>
              <span>${edition?.date || ''}</span>
              <span>Page ${pNum} · ${PAGE_NAMES[pNum - 1].split('·')[1]} (${pageLayout.templateName})</span>
            </div>
          </div>
          <div class="articles-container">
            ${pageLayout.blocks
              .map(block => {
                const saved = savedSectionsMap.get(block.section_key);
                const headline = saved?.title || block.section_name;
                const body = saved?.content || '<span style="color:#94a3b8; font-style:italic;">No text</span>';
                return `
                  <div class="article span-${block.span}">
                    <div class="section-tag">${block.section_name.toUpperCase()}</div>
                    <div class="headline">${headline}</div>
                    <div class="body">${body}</div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #0f2044; background: #fff; }
          .sheet { max-width: 800px; margin: 0 auto 40px auto; padding-bottom: 20px; }
          .page-break { page-break-after: always; }
          .masthead { text-align: center; border-bottom: 3px double #0d1b3a; padding-bottom: 6px; margin-bottom: 16px; }
          .newspaper-name { font-size: 32px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #0d1b3a; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px; border-top: 1px solid #cbd5e1; padding-top: 4px; }
          .articles-container { display: flex; flex-wrap: wrap; gap: 16px; }
          .article { flex: 1 1 calc(33% - 12px); border-bottom: 1px solid #e6ebf2; padding-bottom: 12px; box-sizing: border-box; }
          .article.span-2 { flex: 1 1 calc(66% - 12px); }
          .article.span-3 { flex: 1 1 100%; }
          .section-tag { font-size: 9px; font-weight: 800; color: #2f6bf6; letter-spacing: 0.5px; margin-bottom: 2px; }
          .headline { font-size: 15px; font-weight: 800; color: #0f2044; line-height: 1.25; margin-bottom: 6px; }
          .body { font-size: 11px; line-height: 1.5; color: #334155; }
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
    } catch (e: any) {
      // Fallback directly to native system print dialog if sharing is restricted
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
    <SafeAreaView style={styles.container}>
      {/* Top action bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {edition?.newspaper_name} - Print Preview
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={styles.printHeaderBtn} onPress={handlePrint}>
            <Text style={styles.printHeaderBtnText}>🖨 Print</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfBtn} onPress={handleExportPDF}>
            <Text style={styles.pdfBtnText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sheet Selector Tabs */}
      <View style={styles.tabRow}>
        {PAGE_NAMES.map((name, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.tab, activeSheet === idx && styles.tabActive]}
            onPress={() => setActiveSheet(idx)}
          >
            <Text style={[styles.tabText, activeSheet === idx && styles.tabTextActive]}>
              P{idx + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Newspaper Sheet Canvas */}
      <ScrollView style={styles.sheetContainer} contentContainerStyle={styles.sheetScroll}>
        <View style={styles.newspaperSheet}>
          {/* Newspaper Masthead */}
          <View style={styles.masthead}>
            <Text style={styles.mastheadTitle}>
              {edition?.newspaper_name?.toUpperCase() || 'NEWSRUSH'}
            </Text>
            <View style={styles.mastheadRuleDouble} />
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{edition?.edition_label || 'Daily Edition'}</Text>
              <Text style={styles.metaText}>{edition?.date}</Text>
              <Text style={styles.metaText}>{currentBuiltPage.templateName}</Text>
            </View>
            <View style={styles.mastheadRuleSingle} />
          </View>

          {/* Section Articles in Template Order */}
          {currentBuiltPage.blocks.map((block, idx) => {
            const sec = savedSectionsMap.get(block.section_key);
            const headline = sec?.title || '';
            const content = sec?.content || '';

            return (
              <View key={block.section_key || idx} style={styles.articleCard}>
                <Text style={styles.articleSectionLabel}>{block.section_name.toUpperCase()}</Text>
                <Text style={styles.articleHeadline}>{headline || 'Untitled Story'}</Text>
                <Text style={styles.articleBody}>{content || 'No content provided for this section.'}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Completion Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Current Status:</Text>
          <Text style={styles.statusVal}>{edition?.status?.toUpperCase()}</Text>
        </View>

        {edition?.status !== 'completed' && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleMarkCompleted}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.completeBtnText}>✓ Mark as Completed</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy950 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.navy900,
  },
  backBtn: { padding: 4 },
  backText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  printHeaderBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  printHeaderBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  pdfBtn: { backgroundColor: Colors.brand500, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  pdfBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.navy900, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.brand500 },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },
  sheetContainer: { flex: 1, backgroundColor: '#334155' },
  sheetScroll: { padding: 16, alignItems: 'center' },
  newspaperSheet: {
    width: '100%', maxWidth: 460, backgroundColor: '#ffffff',
    borderRadius: 8, padding: 18, shadowColor: '#000',
    shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  masthead: { alignItems: 'center', marginBottom: 16 },
  mastheadTitle: { fontSize: 24, fontWeight: '900', color: Colors.navy900, letterSpacing: 2, marginBottom: 4 },
  mastheadRuleDouble: { height: 2, backgroundColor: Colors.navy900, width: '100%', marginVertical: 3 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 2 },
  metaText: { fontSize: 11, fontWeight: '600', color: Colors.muted },
  mastheadRuleSingle: { height: 1, backgroundColor: Colors.border, width: '100%', marginTop: 3 },
  articleCard: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 12 },
  articleSectionLabel: { fontSize: 10, fontWeight: '800', color: Colors.brand500, letterSpacing: 0.5, marginBottom: 2 },
  articleHeadline: { fontSize: 16, fontWeight: '800', color: Colors.ink, lineHeight: 21, marginBottom: 6 },
  articleBody: { fontSize: 13, color: '#334155', lineHeight: 19 },
  bottomBar: {
    backgroundColor: Colors.navy900, padding: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statusInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  statusVal: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  completeBtn: { backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  completeBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
