import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOODS, MoodKey } from '@/constants/moods';
import { Colors, Radius, Typography } from '@/constants/tokens';

interface MoodPickerProps {
  selected: MoodKey | null;
  onSelect: (key: MoodKey) => void;
}

export function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  return (
    <View style={styles.grid}>
      {MOODS.map((mood) => {
        const isSelected = selected === mood.key;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={mood.key}
            onPress={() => onSelect(mood.key)}
            style={[
              styles.card,
              isSelected && { borderColor: Colors.primary, transform: [{ translateY: -2 }], shadowColor: mood.color, shadowOpacity: 0.18 },
            ]}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text style={styles.label}>{mood.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '22.9%',
    minHeight: 98,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.surface,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  emoji: { fontSize: 28 },
  label: { fontFamily: Typography.fontBodyMedium, fontSize: 12, color: Colors.ink2, textAlign: 'center' },
});
