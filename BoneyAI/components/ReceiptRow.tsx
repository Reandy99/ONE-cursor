import { StyleSheet, Text, View } from 'react-native';

import { formatIDR } from '@/constants/dummy';
import { getMood, Receipt } from '@/constants/moods';
import { Colors, Radius, Typography } from '@/constants/tokens';

interface ReceiptRowProps {
  receipt: Receipt;
}

export function ReceiptRow({ receipt }: ReceiptRowProps) {
  const mood = getMood(receipt.moodKey);

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: mood.color }]} />
      <View style={styles.main}>
        <Text style={styles.merchant}>{receipt.merchant}</Text>
        <Text style={styles.meta}>
          {receipt.time} · {mood.label}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatIDR(receipt.amount)}</Text>
        <Text style={styles.category}>{receipt.category}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  dot: { width: 12, height: 12, borderRadius: Radius.pill },
  main: { flex: 1 },
  merchant: { fontFamily: Typography.fontBodyBold, color: Colors.ink, fontSize: 15 },
  meta: { fontFamily: Typography.fontBody, color: Colors.mute, fontSize: 12, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontFamily: Typography.fontBodyBold, color: Colors.ink, fontSize: 14 },
  category: { fontFamily: Typography.fontBodyMedium, color: Colors.primary, fontSize: 11, backgroundColor: '#fff1f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, overflow: 'hidden' },
});
