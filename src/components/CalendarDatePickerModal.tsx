import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Check,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  value: string; // ISO format: 'YYYY-MM-DD'
  onSelect: (dateString: string) => void;
  onClose: () => void;
  title?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatIso = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

const getTodayIso = () => {
  const now = new Date();
  return formatIso(now.getFullYear(), now.getMonth(), now.getDate());
};

const parseIsoSafe = (iso: string) => {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime()) && date.getMonth() === m - 1) {
      return { year: y, month: m - 1, day: d };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
};

export default function CalendarDatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  title = 'Select Publication Date',
}: Props) {
  const parsed = useMemo(() => parseIsoSafe(value), [value]);

  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const [selectedIso, setSelectedIso] = useState<string>(
    formatIso(parsed.year, parsed.month, parsed.day)
  );

  const todayIso = useMemo(() => getTodayIso(), []);

  // Sync internal state when opened or value prop changes
  useEffect(() => {
    if (visible) {
      const p = parseIsoSafe(value);
      setViewYear(p.year);
      setViewMonth(p.month);
      setSelectedIso(formatIso(p.year, p.month, p.day));
    }
  }, [visible, value]);

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const prevYear = () => setViewYear(y => y - 1);
  const nextYear = () => setViewYear(y => y + 1);

  const handleSelectToday = () => {
    const now = new Date();
    const tYear = now.getFullYear();
    const tMonth = now.getMonth();
    const tDay = now.getDate();
    const tIso = formatIso(tYear, tMonth, tDay);
    setViewYear(tYear);
    setViewMonth(tMonth);
    setSelectedIso(tIso);
  };

  const handleDayPress = (day: number) => {
    const chosen = formatIso(viewYear, viewMonth, day);
    setSelectedIso(chosen);
  };

  const handleConfirm = () => {
    onSelect(selectedIso);
    onClose();
  };

  // Generate calendar grid cells
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      key: string;
      day: number;
      isCurrentMonth: boolean;
      iso: string;
    }[] = [];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        key: `prev-${d}`,
        day: d,
        isCurrentMonth: false,
        iso: formatIso(prevY, prevM, d),
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        key: `curr-${d}`,
        day: d,
        isCurrentMonth: true,
        iso: formatIso(viewYear, viewMonth, d),
      });
    }

    // Trailing days from next month to complete the last row
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const nextCount = 7 - remainder;
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      for (let d = 1; d <= nextCount; d++) {
        cells.push({
          key: `next-${d}`,
          day: d,
          isCurrentMonth: false,
          iso: formatIso(nextY, nextM, d),
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Formatted date preview for selected day
  const formattedPreview = useMemo(() => {
    if (!selectedIso) return '';
    try {
      const [y, m, d] = selectedIso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedIso;
    }
  }, [selectedIso]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.calendarIconCircle}>
                <CalendarIcon size={16} color={Colors.brand600} strokeWidth={2.2} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
            >
              <X size={18} color={Colors.muted} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Navigation Row */}
          <View style={styles.navRow}>
            <View style={styles.navArrowsGroup}>
              <TouchableOpacity
                onPress={prevYear}
                style={styles.arrowBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Previous Year"
              >
                <ChevronsLeft size={16} color={Colors.ink} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={prevMonth}
                style={styles.arrowBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Previous Month"
              >
                <ChevronLeft size={16} color={Colors.ink} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthYearCenter}>
              <Text style={styles.monthYearText}>
                {MONTH_NAMES[viewMonth]} <Text style={styles.yearText}>{viewYear}</Text>
              </Text>
            </View>

            <View style={styles.navArrowsGroup}>
              <TouchableOpacity
                onPress={nextMonth}
                style={styles.arrowBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Next Month"
              >
                <ChevronRight size={16} color={Colors.ink} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={nextYear}
                style={styles.arrowBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Next Year"
              >
                <ChevronsRight size={16} color={Colors.ink} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Names Header */}
          <View style={styles.weekdaysRow}>
            {WEEKDAY_NAMES.map((name, idx) => (
              <View key={idx} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{name}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {calendarCells.map(cell => {
              const isSelected = cell.iso === selectedIso;
              const isToday = cell.iso === todayIso;

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    !isSelected && isToday && styles.dayCellToday,
                  ]}
                  onPress={() => {
                    if (cell.isCurrentMonth) {
                      handleDayPress(cell.day);
                    } else {
                      // Selecting a grayed date from prev/next month navigates to it
                      const [y, m, d] = cell.iso.split('-').map(Number);
                      setViewYear(y);
                      setViewMonth(m - 1);
                      setSelectedIso(cell.iso);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !cell.isCurrentMonth && styles.dayTextOtherMonth,
                      isSelected && styles.dayTextSelected,
                      !isSelected && isToday && styles.dayTextToday,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {!isSelected && isToday && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Shortcuts & Selection Preview */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.todayShortcutBtn}
              onPress={handleSelectToday}
              activeOpacity={0.8}
            >
              <Text style={styles.todayShortcutText}>Today</Text>
            </TouchableOpacity>

            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Selected Date:</Text>
              <Text style={styles.previewValue} numberOfLines={1}>
                {selectedIso} ({formattedPreview})
              </Text>
            </View>
          </View>

          {/* Dialog Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Check size={15} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.confirmBtnText}>Set Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.navy900,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy900,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.canvas,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navArrowsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthYearCenter: {
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.navy900,
  },
  yearText: {
    color: Colors.brand600,
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: Colors.navy900,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.brand500,
    backgroundColor: Colors.brand50,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
  },
  dayTextOtherMonth: {
    color: '#cbd5e1',
    fontWeight: '400',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dayTextToday: {
    color: Colors.brand600,
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    bottom: 2,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: Colors.brand500,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  todayShortcutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
  },
  todayShortcutText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.brand600,
  },
  previewBox: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  previewValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    color: Colors.muted,
    fontWeight: '700',
    fontSize: 12.5,
  },
  confirmBtn: {
    flex: 1.3,
    backgroundColor: Colors.navy900,
    borderRadius: 9,
    height: 38,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12.5,
  },
});
