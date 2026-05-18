import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BoneyMark } from '@/components/BoneyMark';
import { ReceiptRow } from '@/components/ReceiptRow';
import { RECEIPTS_TODAY, formatIDR } from '@/constants/dummy';
import { getMood } from '@/constants/moods';
import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { useMoodStore } from '@/store/moodStore';

export default function HomeScreen() {
  const todayEntry = useMoodStore((state) => state.todayEntry);
  const [refreshing, setRefreshing] = useState(false);
  const todayMood = todayEntry ? getMood(todayEntry.moodKey) : null;
  const total = RECEIPTS_TODAY.reduce((sum, receipt) => sum + receipt.amount, 0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl tintColor={Colors.primary} refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>MONDAY · MAY 2026</Text>
          <Text style={styles.title}>Hi, Rea 👋</Text>
        </View>
        <BoneyMark size={48} />
      </View>

      <Pressable onPress={() => router.push('/mood')} style={styles.moodStrip}>
        <LinearGradient colors={['rgba(244,63,94,0.16)', 'rgba(251,146,60,0.08)']} style={StyleSheet.absoluteFill} />
        {todayMood ? (
          <>
            <Text style={styles.stripTitle}>Today you feel</Text>
            <View style={[styles.moodPill, { backgroundColor: `${todayMood.color}22` }]}>
              <Text style={styles.moodEmoji}>{todayMood.emoji}</Text>
              <Text style={[styles.moodLabel, { color: todayMood.color }]}>{todayMood.label}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.stripTitle}>How are you feeling?</Text>
            <Text style={styles.stripCopy}>Tap to log your daily mood with Boney.</Text>
          </>
        )}
      </Pressable>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Today's spending</Text>
          <Text style={styles.sectionMeta}>{formatIDR(total)} across {RECEIPTS_TODAY.length} receipts</Text>
        </View>
      </View>

      <View style={styles.card}>
        {RECEIPTS_TODAY.map((receipt) => (
          <ReceiptRow key={receipt.id} receipt={receipt} />
        ))}
      </View>

      <View style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <BoneyMark size={34} showWordmark />
          <Text style={styles.noteBadge}>Insight</Text>
        </View>
        <Text style={styles.noteText}>You spent more after 8pm on anxious or sad days. Boney can help you set a softer pause before checkout.</Text>
        <Pressable onPress={() => router.push('/chat')} style={styles.chatButton}>
          <Text style={styles.chatButtonText}>Chat with Boney</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.screenPaddingTop, paddingHorizontal: Spacing.screenPaddingH, paddingBottom: 118, gap: 18, backgroundColor: Colors.page },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontFamily: Typography.fontBodyBold, color: Colors.mute, fontSize: 12, letterSpacing: 1.2 },
  title: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 34, letterSpacing: -1, marginTop: 4 },
  moodStrip: { minHeight: 116, borderRadius: Radius.cardLg, padding: 20, overflow: 'hidden', justifyContent: 'center', borderWidth: 1, borderColor: Colors.hairline },
  stripTitle: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 24, letterSpacing: -0.4 },
  stripCopy: { fontFamily: Typography.fontBody, color: Colors.ink2, marginTop: 6, fontSize: 15 },
  moodPill: { marginTop: 12, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontFamily: Typography.fontBodyBold, fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 22, letterSpacing: -0.4 },
  sectionMeta: { fontFamily: Typography.fontBody, color: Colors.mute, marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, paddingHorizontal: 16, ...Colors.shadowCard },
  noteCard: { backgroundColor: Colors.surface, borderRadius: Radius.cardLg, padding: 18, gap: 14, ...Colors.shadowCard },
  noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteBadge: { fontFamily: Typography.fontBodyBold, color: Colors.secondary, backgroundColor: '#f3e8ff', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden', fontSize: 12 },
  noteText: { fontFamily: Typography.fontBody, color: Colors.ink2, fontSize: 15, lineHeight: 23 },
  chatButton: { backgroundColor: Colors.ink, borderRadius: Radius.btn, paddingVertical: 14, alignItems: 'center' },
  chatButtonText: { fontFamily: Typography.fontBodyBold, color: Colors.surface, fontSize: 15 },
});
