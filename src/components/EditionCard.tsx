import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { EditionSummary } from '../types';
import StatusBadge from './StatusBadge';
import NewspaperThumb from './NewspaperThumb';

interface Props {
  edition: EditionSummary;
  completedCount?: number;
  onOpen: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
}

const TOTAL_SECTIONS = 19;

export default function EditionCard({
  edition,
  completedCount = 0,
  onOpen,
  onPrint,
  onDelete,
}: Props) {
  const rawDate = edition.date || edition.created_at || edition.createdAt;
  const formattedDate = rawDate
    ? new Date(`${String(rawDate).split('T')[0]}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const percent = Math.min(100, Math.round((completedCount / TOTAL_SECTIONS) * 100));
  const isAllDone = completedCount >= TOTAL_SECTIONS || edition.status === 'completed' || edition.status === 'ready';

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        {/* Newspaper Thumbnail */}
        <NewspaperThumb
          masthead={edition.newspaper_name || 'DAILY NEWS'}
          art="city"
          size="md"
        />

        {/* Info Column */}
        <View style={styles.infoCol}>
          <View style={styles.topMeta}>
            <Text style={styles.editionLabel} numberOfLines={1}>
              {edition.edition_label || 'Edition'}
            </Text>
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.deleteIconBtn}
              >
                <Text style={styles.deleteIconText}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={onOpen} activeOpacity={0.7}>
            <Text style={styles.newspaperName} numberOfLines={2}>
              {edition.newspaper_name || edition.title || 'NewsRush'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.dateText}>
            📅 {formattedDate}
          </Text>

          {/* Progress towards 19 sections */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressText}>
                {completedCount} of {TOTAL_SECTIONS} sections
              </Text>
              <Text style={styles.progressPercent}>{percent}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percent}%`,
                    backgroundColor: isAllDone ? Colors.success : Colors.brand500,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Footer / Actions */}
      <View style={styles.footerRow}>
        <StatusBadge status={edition.status} />

        <View style={styles.actionButtons}>
          {isAllDone && onPrint && (
            <TouchableOpacity style={styles.printBtn} onPress={onPrint} activeOpacity={0.7}>
              <Text style={styles.printBtnText}>🖨 Print</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.openEditorBtn} onPress={onOpen} activeOpacity={0.7}>
            <Text style={styles.openEditorText}>Open editor →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  editionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brand500,
  },
  deleteIconBtn: {
    padding: 2,
  },
  deleteIconText: {
    fontSize: 15,
    color: Colors.muted,
  },
  newspaperName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 22,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.muted,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.navy50,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 14,
    paddingTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  printBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  printBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  openEditorBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  openEditorText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.brand600,
  },
});
