import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

type User = {
  id: string;
  name: string;
  emoji: string;
  streak: number;
  score: number;
};

const ALL_USERS: User[] = [
  { id: '1', name: 'Sophie', emoji: '🌸', streak: 12, score: 480 },
  { id: '2', name: 'Felix', emoji: '🦁', streak: 7, score: 320 },
  { id: '3', name: 'Maja', emoji: '🦋', streak: 9, score: 410 },
  { id: '4', name: 'Leon', emoji: '🐯', streak: 3, score: 120 },
  { id: '5', name: 'Hannah', emoji: '🐼', streak: 15, score: 600 },
  { id: '6', name: 'Noah', emoji: '🦊', streak: 6, score: 250 },
  { id: '7', name: 'Mia', emoji: '🐬', streak: 2, score: 80 },
  { id: '8', name: 'Elias', emoji: '🐻', streak: 11, score: 450 },
];

export default function SuchenScreen() {
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<Set<string>>(new Set());

  const filtered = query.trim()
    ? ALL_USERS.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : ALL_USERS.slice(0, 4);

  function toggleFriend(id: string) {
    setFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Suchen</Text>
        <Text style={styles.subtitle}>Finde Freunde und trink gemeinsam</Text>
      </View>

      {/* Search Field */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Brand.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Name eingeben..."
          placeholderTextColor={Brand.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="words"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Brand.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!query && <Text style={styles.sectionLabel}>VORSCHLÄGE</Text>}

        {filtered.map((user) => {
          const isFriend = friends.has(user.id);
          return (
            <View key={user.id} style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{user.emoji}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userStats}>
                  🔥 {user.streak} Streak · ⭐ {user.score} P.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, isFriend && styles.addBtnDone]}
                onPress={() => toggleFriend(user.id)}
                activeOpacity={0.75}>
                <Text style={[styles.addBtnText, isFriend && styles.addBtnTextDone]}>
                  {isFriend ? '✓ Freund' : 'Hinzufügen'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <Text style={styles.noResults}>Kein Nutzer gefunden.</Text>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.background },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '900', color: Brand.text },
  subtitle: { fontSize: 13, color: Brand.textMuted, fontWeight: '600', marginTop: 2 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Brand.text,
  },

  scroll: { flex: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: Brand.text },
  userStats: { fontSize: 12, color: Brand.textMuted, fontWeight: '600', marginTop: 2 },

  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Brand.primary,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: Brand.shadow,
  },
  addBtnDone: {
    backgroundColor: Brand.success,
    borderBottomColor: Brand.successDark,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  addBtnTextDone: {
    color: '#fff',
  },

  noResults: {
    textAlign: 'center',
    color: Brand.textMuted,
    fontWeight: '600',
    fontSize: 15,
    marginTop: 40,
  },
});
