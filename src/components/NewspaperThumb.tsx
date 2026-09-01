import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  masthead?: string;
  art?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ART_COLORS: Record<string, { bg: string; accent: string }> = {
  city: { bg: '#1e3a8a', accent: '#60a5fa' },
  tech: { bg: '#111c44', accent: '#3b82f6' },
  green: { bg: '#14532d', accent: '#4ade80' },
  people: { bg: '#1f2937', accent: '#93a3b8' },
};

const LINE_WIDTHS = [0.85, 0.7, 0.8, 0.6, 0.75, 0.65];

export default function NewspaperThumb({ masthead = 'DAILY NEWS', art = 'city', size = 'md' }: Props) {
  const colors = ART_COLORS[art] || ART_COLORS.city;
  const isSm = size === 'sm';
  const width = isSm ? 64 : 88;
  const height = isSm ? 84 : 116;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Masthead Header */}
      <Text style={styles.masthead} numberOfLines={1}>
        {masthead.toUpperCase()}
      </Text>
      
      {/* Double hairline rules */}
      <View style={styles.ruleDark} />
      <View style={styles.ruleLight} />

      {/* Featured Photo banner */}
      <View style={[styles.photoBox, { backgroundColor: colors.bg }]}>
        <View style={[styles.photoAccent, { backgroundColor: colors.accent }]} />
      </View>

      {/* Column Lines */}
      <View style={styles.columnsRow}>
        <View style={styles.leftCol}>
          {LINE_WIDTHS.map((ratio, i) => (
            <View key={i} style={[styles.textLine, { width: `${ratio * 100}%` }]} />
          ))}
        </View>
        <View style={styles.rightCol}>
          {LINE_WIDTHS.slice(0, 4).map((ratio, i) => (
            <View key={`r-${i}`} style={[styles.textLineSecondary, { width: `${ratio * 100}%` }]} />
          ))}
          <View style={styles.miniBlock} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  masthead: {
    fontSize: 7.5,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.navy900,
    letterSpacing: 0.5,
  },
  ruleDark: {
    height: 1,
    backgroundColor: '#94a3b8',
    marginVertical: 1.5,
  },
  ruleLight: {
    height: 0.5,
    backgroundColor: '#cbd5e1',
    marginBottom: 3,
  },
  photoBox: {
    height: 32,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  photoAccent: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 14,
    borderRadius: 2,
    opacity: 0.8,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  leftCol: {
    flex: 1.2,
    gap: 2.5,
  },
  rightCol: {
    flex: 1,
    gap: 2.5,
  },
  textLine: {
    height: 2,
    backgroundColor: '#cbd5e1',
    borderRadius: 1,
  },
  textLineSecondary: {
    height: 2,
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
  },
  miniBlock: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginTop: 2,
  },
});
