import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { EditionSummary } from '../types';
import { getEditions, createEdition, deleteEdition } from '../api/editions';
import EditionCard from '../components/EditionCard';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WorkspaceScreen() {
  const navigation = useNavigation<Nav>();
  const [editions, setEditions] = useState<EditionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchEditions = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getEditions();
      setEditions(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load editions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchEditions(); }, []));

  const filtered = editions.filter(e => {
    const matchSearch = e.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!newTitle.trim()) { Alert.alert('Error', 'Please enter a title'); return; }
    setCreating(true);
    try {
      const edition = await createEdition({ title: newTitle.trim(), date: new Date().toISOString() });
      setShowCreate(false);
      setNewTitle('');
      navigation.navigate('Editor', { editionId: edition.id });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create edition');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert('Delete Edition', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteEdition(id); fetchEditions(true); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const FILTERS = ['all', 'draft', 'in_progress', 'ready', 'completed'];
  const FILTER_LABELS: Record<string, string> = {
    all: 'All', draft: 'Draft', in_progress: 'In Progress', ready: 'Ready', completed: 'Done',
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Workspace</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search editions..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filterStatus === f && styles.filterChipActive]}
            onPress={() => setFilterStatus(f)}
          >
            <Text style={[styles.filterText, filterStatus === f && styles.filterTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <EditionCard
              edition={item}
              onPress={() => navigation.navigate('Editor', { editionId: item.id })}
              onDelete={() => handleDelete(item.id, item.title)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEditions(true); }} />}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📰</Text>
              <Text style={styles.emptyText}>No editions found</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.emptyBtnText}>Create your first edition</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Edition</Text>
            <Text style={styles.modalLabel}>Edition Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Morning Edition - Sept 2026"
              placeholderTextColor={Colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreate(false); setNewTitle(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  createBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4, gap: 6, flexWrap: 'wrap' },
  filterChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted, marginBottom: 16 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 13, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
