import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('E-Mail fehlt', 'Bitte gib deine E-Mail-Adresse ein.');
      return;
    }
    try {
      setLoading(true);
      const redirectTo = Linking.createURL('reset-password');
      await sendPasswordReset(email.trim(), redirectTo);
      Alert.alert(
        'E-Mail gesendet',
        'Falls die Adresse registriert ist, haben wir dir einen Link zum Zurücksetzen geschickt.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Passwort vergessen"
      subtitle="Gib deine E-Mail ein und wir schicken dir einen Link zum Zurücksetzen."
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
      <View style={styles.buttonWrap}>
        <PrimaryButton title="Reset-Link senden" onPress={handleSubmit} loading={loading} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    marginTop: 16,
  },
});
