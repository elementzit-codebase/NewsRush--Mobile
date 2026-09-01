import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { TemplateBlock } from '../data/templates';

interface Props {
  blocks: TemplateBlock[];
  completedKeys?: Set<string>;
}

const HEIGHT_MAP: Record<string, number> = {
  lead: 16,
  body: 12,
  tall: 14,
  small: 8,
};

export default function TemplateThumb({ blocks, completedKeys }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {blocks.map(b => {
          const isDone = completedKeys?.has(b.section_key);
          const flexSpan = b.span;
          const minHeight = HEIGHT_MAP[b.size] || 10;
          return (
            <View
              key={b.section_key}
              style={[
                styles.block,
                {
                  flexBasis: `${(flexSpan / 3) * 100 - 4}%`,
                  height: minHeight,
                  backgroundColor: isDone ? Colors.brand500 : '#e2e8f0',
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'space-between',
  },
  block: {
    borderRadius: 2,
  },
});
