import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  ready: 'Ready to Print',
  completed: 'Completed',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  completed: { bg: Colors.successLight, text: Colors.success, border: Colors.successBorder },
  ready: { bg: Colors.brand500, text: '#ffffff', border: Colors.brand500 },
  in_progress: { bg: Colors.brand50, text: Colors.brand600, border: Colors.brand100 },
  draft: { bg: '#ffffff', text: Colors.muted, border: Colors.line },
};

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const current = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const label = STATUS_LABELS[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor: current.bg, borderColor: current.border }]}>
      <Text style={[styles.text, { color: current.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
