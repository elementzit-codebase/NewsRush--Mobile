import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { EditionSummary } from '../types';
import { getEditions, getEdition, createEdition, deleteEdition } from '../api/editions';
import EditionCard from '../components/EditionCard';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../contexts/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
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

  // New Edition Modal
  const [showCreate, setShowCreate] = useState(false);
  const [newspaperName, setNewspaperName] = useState('NewsRush');
  const [editionLabel, setEditionLabel] = useState('Morning Edition');
  const [editionDate, setEditionDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  const fetchEditions = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const list = await getEditions();
      const safeList = Array.isArray(list) ? list : ((list as any)?.items || []);
      setEditions(safeList);

      // Fetch progress for each edition
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

  useFocusEffect(useCallback(() => { fetchEditions(true); }, []));

  const filtered = (Array.isArray(editions) ? editions : []).filter(e => {
    const titleStr = `${e?.newspaper_name || ''} ${e?.edition_label || ''} ${e?.title || ''}`.toLowerCase();
    const matchSearch = titleStr.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e?.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!newspaperName.trim() || !editionLabel.trim()) {
      Alert.alert('Error', 'Please fill in Newspaper Name and Edition Label');
      return;
    }
    setCreating(true);
    try {
      const edition = await createEdition({
        newspaper_name: newspaperName.trim(),
        edition_label: editionLabel.trim(),
        date: editionDate || new Date().toISOString().split('T')[0],
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
    Alert.alert('Delete Edition', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteEdition(id);
          fetchEditions(true);
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  };

  const userInitial = user?.first_name ? user.first_name[0].toUpperCase() : (user?.name?.[0]?.toUpperCase() || 'U');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>📰</Text>
          </View>
          <View>
            <Text style={styles.brandText}>NewsRush</Text>
            <Text style={styles.brandSub}>Workspace</Text>
          </View>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Text style={styles.createBtnText}>+ New Edition</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search editions by name or label..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEditions(true); }} />}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📰</Text>
              <Text style={styles.emptyTitle}>No editions found</Text>
              <Text style={styles.emptySubtitle}>Start by creating a new newspaper edition.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.emptyBtnText}>+ Create Edition</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* New Edition Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Newspaper Edition</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Newspaper Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. NewsRush"
              placeholderTextColor={Colors.textMuted}
              value={newspaperName}
              onChangeText={setNewspaperName}
            />

            <Text style={styles.modalLabel}>Edition Label</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Morning Edition"
              placeholderTextColor={Colors.textMuted}
              value={editionLabel}
              onChangeText={setEditionLabel}
            />

            <Text style={styles.modalLabel}>Publication Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={editionDate}
              onChangeText={setEditionDate}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.confirmText}>Create Edition</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.brand50,
    borderWidth: 1, borderColor: Colors.brand100, justifyContent: 'center', alignItems: 'center',
  },
  logoIcon: { fontSize: 18 },
  brandText: { fontSize: 18, fontWeight: '800', color: Colors.navy900 },
  brandSub: { fontSize: 11, color: Colors.muted },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtn: {
    backgroundColor: Colors.brand500, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  createBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  searchRow: { paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.ink,
  },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 6, flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.navy900, borderColor: Colors.navy900 },
  filterText: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  filterTextActive: { color: '#ffffff', fontWeight: '700' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: Colors.muted, textAlign: 'center', marginBottom: 16 },
  emptyBtn: {
    backgroundColor: Colors.brand500, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: Colors.navy900 },
  modalClose: { fontSize: 18, color: Colors.muted, padding: 4 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: Colors.ink, marginBottom: 6 },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: Colors.ink, backgroundColor: '#ffffff', marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelText: { color: Colors.muted, fontWeight: '700' },
  confirmBtn: {
    flex: 1, backgroundColor: Colors.navy900, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmText: { color: '#ffffff', fontWeight: '700' },
});
