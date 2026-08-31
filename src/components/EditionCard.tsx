import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { EditionSummary } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  edition: EditionSummary;
  onPress: () => void;
  onDelete?: () => void;
}

export default function EditionCard({ edition, onPress, onDelete }: Props) {
  const date = new Date(edition.date || edition.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.dateTag}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        <StatusBadge status={edition.status} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{edition.title}</Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>
          {edition.pageCount ?? 4} pages · Updated {new Date(edition.updatedAt).toLocaleDateString()}
        </Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteText}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginVertical: 6,
    shadowColor: Colors.shadow, shadowOpacity: 1, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateTag: { backgroundColor: Colors.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  dateText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 12, color: Colors.textMuted },
  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 18 },
});
