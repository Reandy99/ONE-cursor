import { Inter_400Regular, Inter_500Medium, Inter_700Bold, useFonts as useInterFonts } from '@expo-google-fonts/inter';
import { Outfit_500Medium, Outfit_700Bold, useFonts as useOutfitFonts } from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/tokens';

export default function RootLayout() {
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const [outfitLoaded] = useOutfitFonts({ Outfit_500Medium, Outfit_700Bold });

  if (!interLoaded || !outfitLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.page } }} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.page },
});
