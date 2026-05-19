import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Typography } from '@/constants/tokens';

interface MoodBarProps {
  day: string;
  amountLabel: string;
  color: string;
  heightPercent: number;
}

export function MoodBar({ day, amountLabel, color, heightPercent }: MoodBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.bar, { height: `${Math.max(heightPercent * 100, 12)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.day}>{day}</Text>
      <Text numberOfLines={1} style={styles.amount}>
        {amountLabel.replace('.000', 'k')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 7 },
  track: { height: 150, width: 28, borderRadius: Radius.pill, backgroundColor: Colors.surface2, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: Radius.pill },
  day: { fontFamily: Typography.fontBodyBold, color: Colors.ink, fontSize: 12 },
  amount: { fontFamily: Typography.fontBody, color: Colors.mute, fontSize: 10, width: 48, textAlign: 'center' },
});
