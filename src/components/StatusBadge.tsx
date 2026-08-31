import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { EditionStatus } from '../types';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: Colors.statusDraft, bg: Colors.statusDraftBg },
  in_progress: { label: 'In Progress', color: Colors.statusInProgress, bg: Colors.statusInProgressBg },
  ready: { label: 'Ready', color: Colors.statusReady, bg: Colors.statusReadyBg },
  completed: { label: 'Completed', color: Colors.statusCompleted, bg: Colors.statusCompletedBg },
};

export default function StatusBadge({ status }: { status: EditionStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
