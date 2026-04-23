import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { Brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Fehlende Angaben', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
    } catch (err) {
      Alert.alert('Login fehlgeschlagen', err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title="Willkommen zurück" subtitle="Melde dich an, um deinen Trinkfortschritt weiter zu verfolgen.">
      <AuthInput
        icon="mail-outline"
        placeholder="E-Mail"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <AuthInput
        icon="lock-closed-outline"
        placeholder="Passwort"
        secureTextEntry
        secureToggle
        textContentType="password"
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />
      <Link href="/(auth)/forgot-password" style={styles.forgot}>
        Passwort vergessen?
      </Link>
      <View style={styles.buttonWrap}>
        <PrimaryButton title="Anmelden" onPress={handleSubmit} loading={loading} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Noch keinen Account? </Text>
        <Link href="/(auth)/register" style={styles.footerLink}>
          Registrieren
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    color: Brand.primary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  buttonWrap: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    color: Brand.textMuted,
    fontSize: 15,
  },
  footerLink: {
    color: Brand.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
