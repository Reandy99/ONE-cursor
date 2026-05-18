import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HeroCard } from '@/components/HeroCard';
import { InsightCard } from '@/components/InsightCard';
import { MoodBar } from '@/components/MoodBar';
import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { useWeeklyReport } from '@/hooks/useWeeklyReport';

export default function ReportScreen() {
  const report = useWeeklyReport();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Weekly Report</Text>
          <Text style={styles.range}>{report.dateRange}</Text>
        </View>
      </View>

      <HeroCard value={`${report.correlation.toFixed(1)}`} unit="×" description="Your spending is higher when anxious or sad." />

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Mood-colored spending</Text>
        <View style={styles.chart}>
          {report.bars.map((bar) => (
            <MoodBar key={bar.day} day={bar.day} amountLabel={bar.label} color={bar.mood.color} heightPercent={bar.heightPercent} />
          ))}
        </View>
      </View>

      <View style={styles.insightsCard}>
        <Text style={styles.cardTitle}>Boney noticed</Text>
        <InsightCard icon="📈" text="When anxious/sad, spending rises 2.3× compared with steady mood days." />
        <InsightCard icon="🛍" text="Shopping drives 60% of this week's emotional spending spikes." />
        <InsightCard icon="✨" text="Fri-Sat stayed happy with stable spending — healthy pattern!" />
      </View>

      <Pressable onPress={() => router.push('/chat')} style={styles.ctaWrap}>
        <LinearGradient colors={Colors.gradHero as [string, string]} style={styles.cta}>
          <Text style={styles.ctaText}>Discuss this report with Boney</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.screenPaddingTop, paddingHorizontal: Spacing.screenPaddingH, paddingBottom: 118, gap: 18, backgroundColor: Colors.page },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: Radius.pill, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Colors.shadowCard },
  backText: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 32, marginTop: -4 },
  title: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 30, letterSpacing: -0.9 },
  range: { fontFamily: Typography.fontBody, color: Colors.mute, marginTop: 2 },
  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.cardLg, padding: 18, ...Colors.shadowCard },
  cardTitle: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 22, letterSpacing: -0.4, marginBottom: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minHeight: 214 },
  insightsCard: { backgroundColor: Colors.surface, borderRadius: Radius.cardLg, padding: 18, ...Colors.shadowCard },
  ctaWrap: { borderRadius: Radius.btn, overflow: 'hidden' },
  cta: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: Colors.surface, fontFamily: Typography.fontBodyBold, fontSize: 15 },
});
