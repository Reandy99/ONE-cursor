import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';

interface HeroCardProps {
  value: string;
  unit?: string;
  description: string;
}

export function HeroCard({ value, unit, description }: HeroCardProps) {
  return (
    <LinearGradient colors={Colors.gradHero as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <Text style={styles.value}>
        {value}
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.cardLg, padding: Spacing.cardPad + 6, minHeight: 172, justifyContent: 'flex-end', ...Colors.shadowHero },
  value: { fontFamily: Typography.fontDisplay, color: Colors.surface, fontSize: 58, letterSpacing: -2 },
  unit: { fontSize: 30 },
  description: { fontFamily: Typography.fontBodyMedium, color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 22, maxWidth: 270 },
});
