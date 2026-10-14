import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2, Calendar, Printer, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { EditionSummary } from '../types';
import StatusBadge from './StatusBadge';

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
  const isAllDone =
    completedCount >= TOTAL_SECTIONS ||
    edition.status === 'completed' ||
    edition.status === 'ready';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onOpen}
      activeOpacity={0.82}
    >
      <View style={styles.mainRow}>
        {/* Info Column */}
        <View style={styles.infoCol}>
          <View style={styles.topMeta}>
            <View style={styles.labelRow}>
              <Text style={styles.editionLabel} numberOfLines={1}>
                {edition.edition_label || 'Edition'}
              </Text>
              {edition.language ? (
                <Text style={styles.langTagText}>
                  · {edition.language.toLowerCase() === 'malayalam' ? 'മലയാളം' : edition.language.toUpperCase()}
                </Text>
              ) : null}
            </View>
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.deleteIconBtn}
              >
                <Trash2 size={15} color={Colors.muted} strokeWidth={1.8} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.newspaperName} numberOfLines={1}>
            {edition.newspaper_name || edition.title || 'NewsRush'}
          </Text>

          <View style={styles.dateRow}>
            <Calendar size={12} color={Colors.muted} strokeWidth={1.8} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

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

        {/* Right middle carousel chevron */}
        <View style={styles.chevronBox}>
          <ChevronRight size={20} color={Colors.muted} strokeWidth={2.4} />
        </View>
      </View>

      {/* Footer / Status & Print */}
      <View style={styles.footerRow}>
        <StatusBadge status={edition.status} />

        {isAllDone && onPrint && (
          <TouchableOpacity style={styles.printBtn} onPress={onPrint} activeOpacity={0.7}>
            <Printer size={13} color={Colors.success} strokeWidth={2} />
            <Text style={styles.printBtnText}>Print</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginHorizontal: 14,
    marginVertical: 4,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 1,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  editionLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.brand500,
  },
  langTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  deleteIconBtn: {
    padding: 2,
  },
  newspaperName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 20,
    marginBottom: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: Colors.muted,
  },
  progressContainer: {
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  progressText: {
    fontSize: 11,
    color: Colors.muted,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: Colors.navy50,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  chevronBox: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
    paddingRight: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
    paddingTop: 8,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  printBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.success,
  },
});
