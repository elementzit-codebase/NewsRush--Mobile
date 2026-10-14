import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Users,
  Phone,
  Check,
  X,
  Calendar,
  ShieldCheck,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { User } from '../types';
import { getUsers, approveUser, rejectUser } from '../api/users';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';

const FILTERS: { key: 'pending' | 'approved' | 'all'; label: string }[] = [
  { key: 'pending', label: 'Awaiting approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export default function UsersScreen() {
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const fetchUsers = async (quiet = false, status = filter) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getUsers(status);
      setUsers(Array.isArray(data) ? data : (data as any)?.items || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers(true, filter);
    }, [filter])
  );

  const handleFilterChange = (newFilter: 'pending' | 'approved' | 'all') => {
    setFilter(newFilter);
    fetchUsers(false, newFilter);
  };

  const handleApprove = async (target: User) => {
    const name =
      [target.first_name, target.last_name].filter(Boolean).join(' ') ||
      target.name ||
      target.email;
    setBusyId(target.id);
    try {
      const updated = await approveUser(target.id);
      setUsers(current =>
        filter === 'pending'
          ? current.filter(u => u.id !== target.id)
          : current.map(u => (u.id === target.id ? updated : u))
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || `Failed to approve ${name}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = (target: User) => {
    const name =
      [target.first_name, target.last_name].filter(Boolean).join(' ') ||
      target.name ||
      target.email;
    Alert.alert(
      'Reject Registration',
      `Are you sure you want to reject and remove the registration for ${name} (${target.email})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setBusyId(target.id);
            try {
              await rejectUser(target.id);
              setUsers(current => current.filter(u => u.id !== target.id));
            } catch (e: any) {
              Alert.alert('Error', e.message || `Failed to reject ${name}`);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const canManageUsers = currentUser?.is_system_user || currentUser?.role === 'admin';

  const renderUser = ({ item }: { item: User }) => {
    const isApproved = item.is_approved === true || item.status === 'approved';
    const isBusy = busyId === item.id;
    const name =
      [item.first_name, item.last_name].filter(Boolean).join(' ') ||
      item.name ||
      item.email;

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Avatar user={item} size={40} fontSize={14} />

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {name}
              </Text>
              {item.is_system_user && (
                <View style={styles.roleTag}>
                  <ShieldCheck size={10} color={Colors.muted} strokeWidth={2} />
                  <Text style={styles.roleText}>System user</Text>
                </View>
              )}
            </View>

            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email}
            </Text>

            <View style={styles.metaLine}>
              {item.phone_number ? (
                <View style={styles.metaItem}>
                  <Phone size={11} color={Colors.muted} strokeWidth={1.8} />
                  <Text style={styles.metaText}>{item.phone_number}</Text>
                </View>
              ) : null}
              {item.created_at ? (
                <View style={styles.metaItem}>
                  <Calendar size={11} color={Colors.muted} strokeWidth={1.8} />
                  <Text style={styles.metaText}>Joined {formatDate(item.created_at)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {isApproved ? (
            <View style={styles.approvedBadge}>
              <Check size={12} color={Colors.success} strokeWidth={2.5} />
              <Text style={styles.approvedBadgeText}>Approved</Text>
            </View>
          ) : null}
        </View>

        {canManageUsers && !isApproved && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleReject(item)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <X size={13} color={Colors.error} strokeWidth={2.2} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleApprove(item)}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={13} color="#ffffff" strokeWidth={2.5} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Compact Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Users size={17} color={Colors.brand500} strokeWidth={2.2} />
          </View>
          <View>
            <Text style={styles.heading}>Users</Text>
            <Text style={styles.subHeading}>
              Approve new registrations ({users.length})
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <Avatar user={currentUser} size={32} fontSize={12} />
        </TouchableOpacity>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => handleFilterChange(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand500} size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => String(item.id)}
          renderItem={renderUser}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchUsers(true, filter);
              }}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20, gap: 8 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Users size={24} color={Colors.brand500} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'pending'
                  ? 'No one is waiting for approval'
                  : 'No users to show'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  heading: { fontSize: 16, fontWeight: '800', color: Colors.navy900 },
  subHeading: { fontSize: 11, color: Colors.muted },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  chip: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.brand500,
    borderColor: Colors.brand500,
  },
  chipText: { fontSize: 12, color: Colors.ink, fontWeight: '600' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    backgroundColor: Colors.canvas,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
  },
  userEmail: {
    fontSize: 12.5,
    color: Colors.muted,
    marginTop: 1,
  },
  metaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.muted,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#ffffff',
    paddingVertical: 7,
  },
  rejectBtnText: {
    color: Colors.error,
    fontWeight: '700',
    fontSize: 12.5,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.navy900,
    borderRadius: 8,
    paddingVertical: 7,
  },
  approveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12.5,
  },
  empty: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    marginHorizontal: 14,
    paddingVertical: 32,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
});
