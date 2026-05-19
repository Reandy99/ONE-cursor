import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Typography } from '@/constants/tokens';

const icons: Record<string, string> = { index: '⌂', calendar: '◷', mood: '+', chat: '✦', report: '▥' };

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];

  if (activeRoute.name === 'chat') {
    return null;
  }

  const bar = (
    <View style={styles.bar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isMood = route.name === 'mood';
        const title = descriptors[route.key].options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            key={route.key}
            onPress={onPress}
            style={[styles.item, isMood && styles.moodItem]}
          >
            {isMood ? (
              <LinearGradient colors={Colors.gradHero as [string, string]} style={styles.primaryButton}>
                <Text style={styles.primaryIcon}>+</Text>
              </LinearGradient>
            ) : (
              <>
                <Text style={[styles.icon, { color: isFocused ? Colors.primary : Colors.mute }]}>{icons[route.name]}</Text>
                <Text style={[styles.label, { color: isFocused ? Colors.primary : Colors.mute }]}>{String(title)}</Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {Platform.OS === 'web' ? (
        <View style={styles.blur}>{bar}</View>
      ) : (
        <BlurView intensity={Platform.OS === 'ios' ? 36 : 0} tint="light" style={styles.blur}>
          {bar}
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 8, right: 8, bottom: 0 },
  blur: { borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.88)' },
  bar: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: Colors.hairline, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  moodItem: { marginTop: -24 },
  icon: { fontSize: 22, fontFamily: Typography.fontDisplayMedium },
  label: { fontFamily: Typography.fontBodyMedium, fontSize: 10 },
  primaryButton: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  primaryIcon: { color: Colors.surface, fontSize: 32, lineHeight: 35, fontFamily: Typography.fontDisplay },
});
