import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from '../components/CustomAlert';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Newspaper,
  Plus,
  Search,
  X,
  ArrowUpDown,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { EditionSummary } from '../types';
import { getEditions, getEdition, createEdition, deleteEdition } from '../api/editions';
import EditionCard from '../components/EditionCard';
import Avatar from '../components/Avatar';
import CalendarDatePickerModal from '../components/CalendarDatePickerModal';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../contexts/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'completed', label: 'Completed' },
];

const SORTS: { key: 'latest' | 'oldest' | 'title'; label: string }[] = [
  { key: 'latest', label: 'Latest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'title', label: 'A–Z' },
];

const countCompleted = (sections: any[] = []) =>
  sections.filter(s => s.status === 'completed' && s.title && s.content).length;

export default function WorkspaceScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [editions, setEditions] = useState<EditionSummary[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'title'>('latest');

  const insets = useSafeAreaInsets();
  const tabBottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 10);
  const listBottomPadding = 52 + tabBottomInset + 28;

  // New Edition Modal
  const [showCreate, setShowCreate] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editionLabel, setEditionLabel] = useState('Morning Edition');
  const [editionDate, setEditionDate] = useState(new Date().toISOString().split('T')[0]);
  const [language, setLanguage] = useState<'malayalam' | 'english'>('malayalam');
  const [creating, setCreating] = useState(false);

  const fetchEditions = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const list = await getEditions();
      const safeList = Array.isArray(list) ? list : (list as any)?.items || [];
      setEditions(safeList);

      const details = await Promise.all(
        safeList.map((e: any) => getEdition(e.id).catch(() => null))
      );
      const prog: Record<string, number> = {};
      details.filter(Boolean).forEach(d => {
        if (d && d.id) {
          prog[String(d.id)] = countCompleted(d.sections);
        }
      });
      setProgressMap(prog);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load editions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEditions(true);
    }, [])
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = (Array.isArray(editions) ? editions : []).filter(e => {
      const titleStr = `${e?.newspaper_name || ''} ${e?.edition_label || ''} ${e?.title || ''} ${e?.language || ''}`.toLowerCase();
      const matchSearch = !needle || titleStr.includes(needle);
      const matchStatus = filterStatus === 'all' || e?.status === filterStatus;
      return matchSearch && matchStatus;
    });

    const sorted = [...list];
    if (sortBy === 'title') {
      sorted.sort((a, b) => (a.newspaper_name || '').localeCompare(b.newspaper_name || ''));
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    } else {
      sorted.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }
    return sorted;
  }, [editions, search, filterStatus, sortBy]);

  const cycleSort = () => {
    const idx = SORTS.findIndex(s => s.key === sortBy);
    setSortBy(SORTS[(idx + 1) % SORTS.length].key);
  };

  const handleCreate = async () => {
    if (!editionLabel.trim()) {
      Alert.alert('Error', 'Please enter an Edition Label');
      return;
    }
    if (!editionDate || !/^\d{4}-\d{2}-\d{2}$/.test(editionDate)) {
      Alert.alert('Error', 'Please select a valid publication date (YYYY-MM-DD)');
      return;
    }
    setCreating(true);
    try {
      const edition = await createEdition({
        newspaper_name: 'NewsRush Daily',
        edition_label: editionLabel.trim(),
        date: editionDate,
        language,
      });
      setShowCreate(false);
      navigation.navigate('Editor', { editionId: edition.id as any });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create edition');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string | number, name: string) => {
    Alert.alert('Delete Edition', `Delete "${name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEdition(id);
            setEditions(prev => prev.filter(item => item.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const currentSortLabel = SORTS.find(s => s.key === sortBy)?.label || 'Latest';

  const statusCounts = useMemo(() => ({
    draft: editions.filter(e => e.status === 'draft').length,
    completed: editions.filter(e => e.status === 'completed').length,
  }), [editions]);

  const getEmptyLabel = () => {
    if (search.trim()) return `0 editions matching "${search.trim()}"`;
    switch (filterStatus) {
      case 'draft':
        return '0 drafts';
      case 'completed':
        return '0 completed';
      default:
        return '0 editions';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Compact Top Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Newspaper size={17} color={Colors.brand500} strokeWidth={2.2} />
          </View>
          <View>
            <Text style={styles.brandText}>Workspace</Text>
            <Text style={styles.brandSub}>{editions.length} editions</Text>
          </View>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.createBtnText}>New Edition</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('Profile')}
            activeOpacity={0.8}
          >
            <Avatar user={user} size={32} fontSize={12} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact Search + Sort Row */}
      <View style={styles.controlsWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={15} color={Colors.muted} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search editions by name or label"
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={Colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.sortBtn} onPress={cycleSort} activeOpacity={0.8}>
            <ArrowUpDown size={13} color={Colors.ink} strokeWidth={2} />
            <Text style={styles.sortBtnText}>{currentSortLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filterStatus === f.key && styles.filterChipActive]}
              onPress={() => setFilterStatus(f.key)}
            >
              <Text style={[styles.filterText, filterStatus === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Editions List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={Colors.brand500} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <EditionCard
              edition={item}
              completedCount={progressMap[String(item.id)] || 0}
              onOpen={() => navigation.navigate('Editor', { editionId: item.id as any })}
              onPrint={() => navigation.navigate('PrintEdition', { editionId: item.id as any })}
              onDelete={() => handleDelete(item.id, item.newspaper_name || 'Edition')}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEditions(true);
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: listBottomPadding, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyLabel}>{getEmptyLabel()}</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
                <Plus size={15} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.emptyBtnText}>Create Edition</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* New Edition Modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollWrap}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Edition</Text>
                <TouchableOpacity
                  onPress={() => setShowCreate(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.modalCloseBtn}
                >
                  <X size={18} color={Colors.muted} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Publication Date</Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Choose Publication Date"
              >
                <View style={styles.datePickerTriggerLeft}>
                  <View style={styles.dateIconCircle}>
                    <CalendarIcon size={16} color={Colors.brand600} strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.datePickerValueText}>{editionDate}</Text>
                    <Text style={styles.datePickerSubText}>
                      {new Date(`${editionDate}T00:00:00`).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.dateChangeBadge}>
                  <Text style={styles.dateChangeBadgeText}>Change</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Edition Label</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Morning Edition, Evening"
                placeholderTextColor={Colors.textMuted}
                value={editionLabel}
                onChangeText={setEditionLabel}
              />

              <Text style={styles.modalLabel}>Language</Text>
              <View style={styles.langToggleBox}>
                <TouchableOpacity
                  style={[
                    styles.langOptionBtn,
                    language === 'malayalam' && styles.langOptionBtnActive,
                  ]}
                  onPress={() => setLanguage('malayalam')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      language === 'malayalam' && styles.langOptionTextActive,
                    ]}
                  >
                    മലയാളം
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langOptionBtn,
                    language === 'english' && styles.langOptionBtnActive,
                  ]}
                  onPress={() => setLanguage('english')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      language === 'english' && styles.langOptionTextActive,
                    ]}
                  >
                    English
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.confirmText}>Create Edition</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Interactive Calendar Date Picker Modal */}
      <CalendarDatePickerModal
        visible={showDatePicker}
        value={editionDate}
        onSelect={selected => setEditionDate(selected)}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: { fontSize: 16, fontWeight: '800', color: Colors.navy900 },
  brandSub: { fontSize: 11, color: Colors.muted },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.navy900,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  createBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12.5 },
  controlsWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#ffffff',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.ink,
    paddingVertical: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    height: 38,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.brand500,
    borderColor: Colors.brand500,
  },
  filterText: { fontSize: 11.5, color: Colors.ink, fontWeight: '600' },
  filterTextActive: { color: '#ffffff', fontWeight: '700' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.muted,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.navy900,
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  emptyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  modalScrollWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.navy900 },
  modalCloseBtn: { padding: 4 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  datePickerTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerValueText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  datePickerSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    marginTop: 0.5,
  },
  dateChangeBadge: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateChangeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.brand600,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 11,
    height: 40,
    fontSize: 13.5,
    color: Colors.ink,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  langToggleBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.canvas,
    padding: 3,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  langOptionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langOptionBtnActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  langOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  langOptionTextActive: {
    color: Colors.brand600,
    fontWeight: '700',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: Colors.muted, fontWeight: '700', fontSize: 13 },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.navy900,
    borderRadius: 9,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
