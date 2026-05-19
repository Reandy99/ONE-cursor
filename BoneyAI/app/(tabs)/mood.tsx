import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { MoodPicker } from '@/components/MoodPicker';
import { getMood, MoodKey } from '@/constants/moods';
import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { todayISO } from '@/constants/dummy';
import { useMoodStore } from '@/store/moodStore';

export default function MoodScreen() {
  const todayEntry = useMoodStore((state) => state.todayEntry);
  const addEntry = useMoodStore((state) => state.addEntry);
  const [selected, setSelected] = useState<MoodKey | null>(todayEntry?.moodKey ?? null);
  const [note, setNote] = useState(todayEntry?.note ?? '');

  const todayMood = todayEntry ? getMood(todayEntry.moodKey) : null;

  const save = () => {
    if (!selected) {
      return;
    }
    addEntry({ date: todayISO(), moodKey: selected, note: note.trim() || undefined });
    router.push('/');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>Daily check-in · Today</Text>
        <Text style={styles.title}>How are you feeling today?</Text>

        {todayMood ? (
          <View style={styles.summary}>
            <Text style={styles.summaryEmoji}>{todayMood.emoji}</Text>
            <Text style={styles.summaryTitle}>Already logged: {todayMood.label}</Text>
            <Text style={styles.summaryCopy}>You can update today's check-in before the day ends.</Text>
          </View>
        ) : null}

        <MoodPicker selected={selected} onSelect={setSelected} />

        <TextInput
          multiline
          onChangeText={setNote}
          placeholder="Add a note... (optional)"
          placeholderTextColor={Colors.mute}
          style={styles.input}
          textAlignVertical="top"
          value={note}
        />

        <Pressable disabled={!selected} onPress={save} style={({ pressed }) => [styles.ctaWrap, (!selected || pressed) && styles.ctaDim]}>
          <LinearGradient colors={Colors.gradHero as [string, string]} style={styles.cta}>
            <Text style={styles.ctaText}>Save check-in</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.page },
  content: { paddingTop: Spacing.screenPaddingTop, paddingHorizontal: Spacing.screenPaddingH, paddingBottom: 118, gap: 18 },
  kicker: { fontFamily: Typography.fontBodyBold, color: Colors.primary, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 36, lineHeight: 40, letterSpacing: -1.3 },
  summary: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 18, alignItems: 'center', ...Colors.shadowCard },
  summaryEmoji: { fontSize: 42 },
  summaryTitle: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 22, marginTop: 6 },
  summaryCopy: { fontFamily: Typography.fontBody, color: Colors.mute, marginTop: 4, textAlign: 'center' },
  input: { minHeight: 132, borderRadius: Radius.card, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.hairline, padding: 16, fontFamily: Typography.fontBody, color: Colors.ink, fontSize: 15 },
  ctaWrap: { borderRadius: Radius.btn, overflow: 'hidden' },
  ctaDim: { opacity: 0.5 },
  cta: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: Colors.surface, fontFamily: Typography.fontBodyBold, fontSize: 16 },
});
