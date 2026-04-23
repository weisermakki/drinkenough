import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) {
      Alert.alert('Passwort zu kurz', 'Mindestens 6 Zeichen.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwörter stimmen nicht überein');
      return;
    }
    try {
      setLoading(true);
      await updatePassword(password);
      Alert.alert('Passwort aktualisiert', 'Du bist jetzt angemeldet.');
    } catch (err) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title="Neues Passwort" subtitle="Wähle ein neues Passwort für dein Konto.">
      <AuthInput
        icon="lock-closed-outline"
        placeholder="Neues Passwort"
        secureTextEntry
        secureToggle
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
        <PrimaryButton title="Passwort speichern" onPress={handleSubmit} loading={loading} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    marginTop: 16,
  },
});
