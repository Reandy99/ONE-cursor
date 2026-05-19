import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Typography } from '@/constants/tokens';

interface InsightCardProps {
  icon: string;
  text: string;
}

export function InsightCard({ icon, text }: InsightCardProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: Radius.pill, backgroundColor: Colors.surface2, textAlign: 'center', lineHeight: 36, fontSize: 18, overflow: 'hidden' },
  text: { flex: 1, fontFamily: Typography.fontBodyMedium, color: Colors.ink2, fontSize: 14, lineHeight: 20 },
});
