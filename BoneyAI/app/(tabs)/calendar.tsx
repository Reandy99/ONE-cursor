import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReceiptRow } from '@/components/ReceiptRow';
import { SEED_RECEIPTS, toISODate, todayISO } from '@/constants/dummy';
import { getMood, MOODS } from '@/constants/moods';
import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { useMoodHistory } from '@/hooks/useMoodHistory';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarScreen() {
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const { entryByDate } = useMoodHistory(visibleMonth);

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const first = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: first.getDay() }, () => null);
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [visibleMonth]);

  const selectedEntry = entryByDate.get(selectedDate);
  const selectedMood = selectedEntry ? getMood(selectedEntry.moodKey) : null;
  const selectedReceipts = SEED_RECEIPTS.filter((receipt) => receipt.date === selectedDate);

  const changeMonth = (direction: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.weekRow}>
          {weekdays.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {days.map((date, index) => {
            const key = date ? toISODate(date) : `blank-${index}`;
            const entry = date ? entryByDate.get(key) : undefined;
            const mood = entry ? getMood(entry.moodKey) : null;
            const isToday = key === todayISO();
            const isSelected = key === selectedDate;

            return (
              <Pressable disabled={!date} key={key} onPress={() => setSelectedDate(key)} style={styles.dayCell}>
                {date ? (
                  <View style={[styles.dayCircle, mood ? { backgroundColor: mood.color, borderColor: mood.color } : null, isToday && styles.todayCircle, isSelected && styles.selectedCircle]}>
                    <Text style={[styles.dayText, mood && styles.dayTextFilled]}>{date.getDate()}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        {MOODS.map((mood) => (
          <View key={mood.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: mood.color }]} />
            <Text style={styles.legendText}>{mood.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.detailCard}>
        {selectedMood ? (
          <>
            <Text style={styles.detailEmoji}>{selectedMood.emoji}</Text>
            <Text style={styles.detailTitle}>{selectedMood.label} day</Text>
            <Text style={styles.detailCopy}>{selectedEntry?.note ?? 'No note logged. Spending stayed visible so Boney can spot patterns.'}</Text>
          </>
        ) : (
          <>
            <Text style={styles.detailTitle}>No mood logged</Text>
            <Text style={styles.detailCopy}>Tap the center tab to add a check-in for this day.</Text>
          </>
        )}
        {selectedReceipts.map((receipt) => (
          <ReceiptRow key={receipt.id} receipt={receipt} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.screenPaddingTop, paddingHorizontal: Spacing.screenPaddingH, paddingBottom: 118, gap: 18, backgroundColor: Colors.page },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: Typography.fontDisplay, fontSize: 28, color: Colors.ink, letterSpacing: -0.8 },
  arrow: { width: 42, height: 42, borderRadius: Radius.pill, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Colors.shadowCard },
  arrowText: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 30, marginTop: -2 },
  calendarCard: { backgroundColor: Colors.surface, borderRadius: Radius.cardLg, padding: 14, ...Colors.shadowCard },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: Typography.fontBodyBold, color: Colors.mute, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 7 },
  dayCircle: { width: 38, height: 38, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.hairlineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  todayCircle: { borderWidth: 2, borderColor: Colors.ink },
  selectedCircle: { transform: [{ scale: 1.08 }] },
  dayText: { fontFamily: Typography.fontBodyMedium, color: Colors.mute, fontSize: 13 },
  dayTextFilled: { color: Colors.surface, fontFamily: Typography.fontBodyBold },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  legendDot: { width: 8, height: 8, borderRadius: Radius.pill },
  legendText: { fontFamily: Typography.fontBodyMedium, color: Colors.ink2, fontSize: 12 },
  detailCard: { backgroundColor: Colors.surface, borderRadius: Radius.cardLg, padding: 18, ...Colors.shadowCard },
  detailEmoji: { fontSize: 38 },
  detailTitle: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 24, marginTop: 4 },
  detailCopy: { fontFamily: Typography.fontBody, color: Colors.mute, lineHeight: 21, marginTop: 4, marginBottom: 10 },
});
