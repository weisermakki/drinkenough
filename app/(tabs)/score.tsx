import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useWater } from '@/contexts/WaterContext';
import { useAuth } from '@/contexts/AuthContext';

type Player = {
  id: string;
  name: string;
  emoji: string;
  score: number;
  streak: number;
  isMe: boolean;
};

const RANK_COLORS = {
  1: '#ffc800',
  2: '#b0bec5',
  3: '#bf8d5b',
} as const;

export default function ScoreScreen() {
  const { score, streak } = useWater();
  const { session } = useAuth();

  const myName = session?.user?.email?.split('@')[0] ?? 'Ich';

  const rawPlayers: Player[] = [
    { id: '1', name: 'Anna', emoji: '👧', score: 820, streak: 14, isMe: false },
    { id: '2', name: 'Lena', emoji: '🦋', score: 680, streak: 9, isMe: false },
    { id: '3', name: 'Tom', emoji: '🐻', score: 560, streak: 7, isMe: false },
    { id: 'me', name: myName, emoji: '💧', score, streak, isMe: true },
    { id: '5', name: 'Emma', emoji: '🌺', score: 340, streak: 5, isMe: false },
    { id: '6', name: 'Kai', emoji: '🦊', score: 280, streak: 3, isMe: false },
    { id: '7', name: 'Mia', emoji: '🐬', score: 200, streak: 2, isMe: false },
  ];

  const players = [...rawPlayers].sort((a, b) => b.score - a.score);
  const top3 = [players[1], players[0], players[2]]; // 2nd, 1st, 3rd for podium layout
  const rest = players.slice(3);
  const meRank = players.findIndex((p) => p.isMe) + 1;

  function PodiumItem({ player, rank }: { player: Player; rank: 1 | 2 | 3 }) {
    const size = rank === 1 ? 64 : 52;
    const borderColor = RANK_COLORS[rank];
    return (
      <View style={[styles.podiumItem, rank === 1 && styles.podiumItemCenter]}>
        <View style={[styles.podiumAvatar, { width: size, height: size, borderRadius: size / 2, borderColor }]}>
          <Text style={[styles.podiumEmoji, rank === 1 && { fontSize: 32 }]}>{player.emoji}</Text>
          <View style={[styles.rankBadge, { backgroundColor: borderColor }]}>
            <Text style={styles.rankBadgeText}>{rank}</Text>
          </View>
        </View>
        <Text style={styles.podiumName}>{player.name}</Text>
        <Text style={styles.podiumPts}>{player.score} P.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bestenliste 🏆</Text>
          <Text style={styles.subtitle}>Diese Woche • Dein Rang: #{meRank}</Text>
        </View>

        {/* Podium */}
        <View style={styles.podium}>
          <PodiumItem player={top3[0]} rank={2} />
          <PodiumItem player={top3[1]} rank={1} />
          <PodiumItem player={top3[2]} rank={3} />
        </View>

        {/* List */}
        <View style={styles.list}>
          {players.map((p, i) => (
            <View key={p.id} style={[styles.listItem, p.isMe && styles.listItemMe]}>
              <Text style={styles.listRank}>{i + 1}</Text>
              <View style={styles.listAvatar}>
                <Text style={styles.listEmoji}>{p.emoji}</Text>
              </View>
              <Text style={styles.listName}>{p.name}{p.isMe ? ' (Ich)' : ''}</Text>
              <Text style={styles.listPts}>{p.score} P.</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.background },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: Brand.text },
  subtitle: { fontSize: 13, color: Brand.textMuted, fontWeight: '600', marginTop: 2 },

  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  podiumItemCenter: {
    marginBottom: 16,
  },
  podiumAvatar: {
    borderWidth: 3,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  podiumEmoji: { fontSize: 26 },
  rankBadge: {
    position: 'absolute',
    bottom: -6,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rankBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  podiumName: { fontSize: 11, fontWeight: '800', color: Brand.text },
  podiumPts: { fontSize: 12, fontWeight: '900', color: Brand.primary },

  list: { paddingHorizontal: 20, gap: 8 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
  },
  listItemMe: {
    backgroundColor: Brand.selectedBg,
    borderColor: Brand.primary,
  },
  listRank: { fontSize: 15, fontWeight: '900', color: Brand.textMuted, width: 24, textAlign: 'center' },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmoji: { fontSize: 20 },
  listName: { flex: 1, fontSize: 15, fontWeight: '700', color: Brand.text },
  listPts: { fontSize: 15, fontWeight: '800', color: Brand.primary },
});
