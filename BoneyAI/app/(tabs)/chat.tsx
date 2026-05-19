import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoneyMark } from '@/components/BoneyMark';
import { ChatBubble } from '@/components/ChatBubble';
import { Colors, Radius, Typography } from '@/constants/tokens';
import { useChatStore } from '@/store/chatStore';

const modes = [
  { key: 'listen', label: '👂 Listen' },
  { key: 'humor', label: '😄 Humor' },
  { key: 'solution', label: '💡 Solution' },
] as const;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const { messages, mode, isThinking, sendMessage, setMode } = useChatStore();

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: Platform.OS !== 'web' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isThinking, scrollToBottom]);

  const submit = async () => {
    const value = text;
    setText('');
    await sendMessage(value);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <BoneyMark size={42} />
        <View style={styles.nameBlock}>
          <Text style={styles.name}>Boney</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.status}>online</Text>
          </View>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} onContentSizeChange={scrollToBottom} showsVerticalScrollIndicator={false}>
        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role} text={message.text} mode={message.mode} />
        ))}
        {isThinking ? (
          <View style={styles.thinking}>
            <Text style={styles.thinkingText}>Boney is thinking</Text>
            <Text style={styles.dots}>•••</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.modeRow}>
        {modes.map((item) => {
          const active = mode === item.key;
          return (
            <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.modeChip, active && styles.modeChipActive]}>
              <Text style={[styles.modeText, active && styles.modeTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          onChangeText={setText}
          placeholder="Tell Boney what happened..."
          placeholderTextColor={Colors.mute}
          style={styles.input}
          value={text}
        />
        <Pressable disabled={!text.trim() || isThinking} onPress={submit} style={[styles.sendWrap, (!text.trim() || isThinking) && styles.sendDisabled]}>
          <LinearGradient colors={Colors.gradHero as [string, string]} style={styles.send}>
            <Text style={styles.sendText}>Send</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.page },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: Colors.page, borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  backButton: { width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Colors.shadowCard },
  backText: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 32, marginTop: -4 },
  nameBlock: { flex: 1 },
  name: { fontFamily: Typography.fontDisplay, color: Colors.ink, fontSize: 21 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: Colors.accent },
  status: { fontFamily: Typography.fontBody, color: Colors.mute, fontSize: 12 },
  messages: { padding: 18, paddingBottom: 20 },
  thinking: { alignSelf: 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: Colors.hairline },
  thinkingText: { fontFamily: Typography.fontBodyMedium, color: Colors.mute, fontSize: 12 },
  dots: { color: Colors.primary, letterSpacing: 2 },
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 10 },
  modeChip: { flex: 1, alignItems: 'center', borderRadius: Radius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.hairline, paddingVertical: 10 },
  modeChipActive: { backgroundColor: '#fff1f2', borderColor: Colors.primary },
  modeText: { fontFamily: Typography.fontBodyMedium, color: Colors.mute, fontSize: 12 },
  modeTextActive: { color: Colors.primary },
  inputBar: { flexDirection: 'row', gap: 10, paddingTop: 10, paddingHorizontal: 18, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.hairline },
  input: { flex: 1, minHeight: 48, backgroundColor: Colors.surface2, borderRadius: Radius.btn, paddingHorizontal: 14, fontFamily: Typography.fontBody, color: Colors.ink },
  sendWrap: { borderRadius: Radius.btn, overflow: 'hidden' },
  sendDisabled: { opacity: 0.45 },
  send: { minHeight: 48, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: Colors.surface, fontFamily: Typography.fontBodyBold },
});
