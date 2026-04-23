import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { session, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Abmelden fehlgeschlagen');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hallo 👋</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOut} hitSlop={10}>
          <Ionicons name="log-out-outline" size={22} color={Brand.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Deine Hydration startet hier.</Text>
        <Text style={styles.subtitle}>
          Dieser Screen wird bald dein tägliches Trinkziel und deinen Fortschritt zeigen.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  greeting: {
    fontSize: 14,
    color: Brand.textMuted,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: Brand.text,
    marginTop: 2,
  },
  signOut: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Brand.surface,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Brand.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: Brand.textMuted,
    lineHeight: 22,
  },
});
