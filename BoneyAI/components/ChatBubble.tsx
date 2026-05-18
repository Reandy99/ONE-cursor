import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { ChatMessage } from '@/constants/moods';
import { Colors, Radius, Typography } from '@/constants/tokens';

const modeLabels = { listen: 'Listen', humor: 'Humor', solution: 'Solution' } as const;

interface ChatBubbleProps {
  role: ChatMessage['role'];
  text: string;
  mode?: ChatMessage['mode'];
}

export function ChatBubble({ role, text, mode }: ChatBubbleProps) {
  const isUser = role === 'user';
  const bubble = (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      {isUser ? (
        <LinearGradient colors={Colors.gradHero as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {bubble}
        </LinearGradient>
      ) : (
        <>
          {bubble}
          {mode ? <Text style={styles.badge}>{modeLabels[mode]}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 7, maxWidth: '86%' },
  userRow: { alignSelf: 'flex-end' },
  assistantRow: { alignSelf: 'flex-start' },
  gradient: { borderRadius: 20, borderTopRightRadius: 4 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: { borderTopRightRadius: 4 },
  assistantBubble: { backgroundColor: Colors.surface, borderTopLeftRadius: 4, borderWidth: 1, borderColor: Colors.hairline, ...Colors.shadowCard },
  text: { fontFamily: Typography.fontBody, fontSize: 15, lineHeight: 22 },
  userText: { color: Colors.surface },
  assistantText: { color: Colors.ink2 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: Colors.surface2,
    color: Colors.mute,
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11,
  },
});
