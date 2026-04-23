import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { Brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || !confirm) {
      Alert.alert('Fehlende Angaben', 'Bitte alle Felder ausfüllen.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Passwort zu kurz', 'Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwörter stimmen nicht überein');
      return;
    }
    try {
      setLoading(true);
      const { needsEmailConfirmation } = await signUp(email.trim(), password);
      if (needsEmailConfirmation) {
        Alert.alert(
          'Fast geschafft',
          'Wir haben dir eine E-Mail zur Bestätigung gesendet. Bestätige den Link und melde dich dann an.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        );
      }
    } catch (err) {
      Alert.alert('Registrierung fehlgeschlagen', err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Account erstellen"
      subtitle="In wenigen Sekunden startklar für deinen Hydrations-Alltag."
      showBack>
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
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <AuthInput
        icon="lock-closed-outline"
        placeholder="Passwort bestätigen"
        secureTextEntry
        secureToggle
        value={confirm}
        onChangeText={setConfirm}
      />
      <View style={styles.buttonWrap}>
        <PrimaryButton title="Registrieren" onPress={handleSubmit} loading={loading} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Bereits registriert? </Text>
        <Link href="/(auth)/login" style={styles.footerLink}>
          Anmelden
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
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
