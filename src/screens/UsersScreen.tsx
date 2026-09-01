import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { User } from '../types';
import { getUsers, approveUser } from '../api/users';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: Colors.warningLight, color: Colors.warning, label: 'Pending' },
  approved: { bg: Colors.successLight, color: Colors.success, label: 'Approved' },
  rejected: { bg: Colors.errorLight, color: Colors.error, label: 'Rejected' },
};

const ROLE_COLORS: Record<string, string> = {
  admin: Colors.primary, editor: Colors.secondary, viewer: Colors.textMuted,
};

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const fetch = async (quiet = false, status = filter) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getUsers(status);
      setUsers(Array.isArray(data) ? data : ((data as any)?.items || []));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetch(true, filter); }, [filter]));

  const handleFilterChange = (newFilter: 'all' | 'pending' | 'approved') => {
    setFilter(newFilter);
    fetch(false, newFilter);
  };

  const handleApprove = (user: User) => {
    const name = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.name || user.email);
    Alert.alert('Approve User', `Approve ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try {
          await approveUser(user.id);
          fetch(true, filter);
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to approve user');
        }
      }},
    ]);
  };

  const canManageUsers = currentUser?.is_system_user || currentUser?.role === 'admin';

  const renderUser = ({ item }: { item: User }) => {
    const isPending = item.is_approved === false || item.status === 'pending';
    const isApproved = item.is_approved === true || item.status === 'approved';
    const sc = isApproved ? STATUS_COLORS.approved : STATUS_COLORS.pending;

    const name = item.first_name
      ? `${item.first_name} ${item.last_name || ''}`.trim()
      : (item.name || item.email);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone_number ? (
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 4 }}>📞 {item.phone_number}</Text>
            ) : null}
            <View style={styles.tagRow}>
              {item.is_system_user && (
                <View style={styles.roleTag}>
                  <Text style={[styles.roleText, { color: Colors.primary }]}>SYSTEM USER</Text>
                </View>
              )}
              <View style={[styles.statusTag, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.color }]}>{isApproved ? 'Approved' : 'Pending'}</Text>
              </View>
            </View>
          </View>
        </View>
        {canManageUsers && isPending && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
              <Text style={styles.approveBtnText}>✓ Approve User</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Users</Text>
        <Text style={styles.count}>{users.length} total</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => handleFilterChange(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => String(item.id)}
          renderItem={renderUser}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(true, filter); }} />}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  count: { fontSize: 14, color: Colors.textMuted },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4, gap: 6 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, elevation: 2, shadowColor: Colors.shadow, shadowOpacity: 1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  tagRow: { flexDirection: 'row', gap: 6 },
  roleTag: { borderRadius: 4, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 6, paddingVertical: 2 },
  roleText: { fontSize: 10, fontWeight: '700' },
  statusTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  approveBtn: { flex: 1, backgroundColor: Colors.successLight, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  approveBtnText: { color: Colors.success, fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, backgroundColor: Colors.errorLight, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rejectBtnText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
});
