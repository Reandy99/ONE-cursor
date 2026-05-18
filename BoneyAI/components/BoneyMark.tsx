import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Typography } from '@/constants/tokens';

interface BoneyMarkProps {
  size?: number;
  showWordmark?: boolean;
}

export function BoneyMark({ size = 36, showWordmark = false }: BoneyMarkProps) {
  return (
    <View style={styles.wrap}>
      <Image
        source={require('../assets/images/boney-puppy.png')}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
      {showWordmark ? <Text style={styles.wordmark}>Boney.AI</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  image: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.hairlineStrong },
  wordmark: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 18, letterSpacing: -0.4 },
});
