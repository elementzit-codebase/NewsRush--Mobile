import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  ready: 'Ready to Print',
  completed: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#059669',
  ready: Colors.brand600,
  in_progress: '#d97706',
  draft: Colors.muted,
};

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const label = STATUS_LABELS[status] || status;

  return (
    <Text style={[styles.text, { color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

