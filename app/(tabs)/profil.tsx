import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useWater } from '@/contexts/WaterContext';
import { useAuth } from '@/contexts/AuthContext';

const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Wassertropfen', xpNeeded: 100 },
  { level: 2, name: 'Hydro-Starter', xpNeeded: 250 },
  { level: 3, name: 'Wasserprofi', xpNeeded: 500 },
  { level: 4, name: 'Hydra-Held', xpNeeded: 1000 },
  { level: 5, name: 'Wasser-Meister', xpNeeded: Infinity },
];

function getLevel(score: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const prev = LEVEL_THRESHOLDS[i - 1];
    const cur = LEVEL_THRESHOLDS[i];
    if (score >= (prev?.xpNeeded ?? 0)) {
      return {
        level: cur.level,
        name: cur.name,
        currentXp: score - (prev?.xpNeeded ?? 0),
        neededXp: cur.xpNeeded - (prev?.xpNeeded ?? 0),
        nextName: LEVEL_THRESHOLDS[i + 1]?.name ?? null,
      };
    }
  }
  return { level: 1, name: 'Wassertropfen', currentXp: score, neededXp: 100, nextName: 'Hydro-Starter' };
}

function getDayLabel(offsetFromMonday: number) {
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  return days[offsetFromMonday];
}

// Build a fake weekly dataset: last 7 days ending today
function buildWeekData(todayMl: number) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = (dayOfWeek + 6) % 7; // 0=Mon
  const mockMl = [1800, 2100, 950, 2000, 1600, 2300, todayMl];

  return Array.from({ length: 7 }, (_, i) => {
    const isFuture = i > mondayOffset;
    const isToday = i === mondayOffset;
    return {
      label: getDayLabel(i),
      ml: isFuture ? 0 : mockMl[i],
      isFuture,
      isToday,
    };
  });
}

export default function ProfilScreen() {
  const { score, streak, totalWaterMl, logs } = useWater();
  const { session, signOut } = useAuth();

  const levelInfo = getLevel(score);
  const xpPct = Math.min(levelInfo.currentXp / levelInfo.neededXp, 1);
  const weekData = buildWeekData(totalWaterMl);
  const maxMl = Math.max(...weekData.map((d) => d.ml), 1);
  const daysActive = Math.max(streak, 1);

  const email = session?.user?.email ?? '';
  const name = email.split('@')[0];
  const totalLiters = (totalWaterMl / 1000).toFixed(1);

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert('Fehler', 'Abmelden fehlgeschlagen');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#e8f7fd', '#f0f0ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Image
              source={require('@/assets/images/tropfen.png')}
              style={styles.avatarImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileJoined}>{email}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={handleSignOut}>
            <Text style={styles.editBtnText}>Abmelden</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>🔥 {streak}</Text>
            <Text style={styles.statLbl}>STREAK</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{score}</Text>
            <Text style={styles.statLbl}>SCORE</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{daysActive}</Text>
            <Text style={styles.statLbl}>TAGE</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{totalLiters}L</Text>
            <Text style={styles.statLbl}>HEUTE</Text>
          </View>
        </View>

        {/* Level Card */}
        <View style={styles.levelCard}>
          <Text style={styles.levelTitle}>LEVEL</Text>
          <Text style={styles.levelName}>
            Level {levelInfo.level} – {levelInfo.name}
          </Text>
          <View style={styles.xpBarBg}>
            <LinearGradient
              colors={[Brand.primary, '#7dd8f5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpBarFill, { width: `${xpPct * 100}%` }]}
            />
          </View>
          <View style={styles.xpLabels}>
            <Text style={styles.xpLbl}>{levelInfo.currentXp} XP</Text>
            {levelInfo.nextName && (
              <Text style={styles.xpLbl}>{levelInfo.neededXp} XP für Level {levelInfo.level + 1}</Text>
            )}
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTitle}>DIESE WOCHE</Text>
          <View style={styles.dayBars}>
            {weekData.map((day) => {
              const barH = day.isFuture ? 0 : (day.ml / maxMl) * 60;
              return (
                <View key={day.label} style={styles.dayBarWrap}>
                  <View
                    style={[
                      styles.dayBar,
                      {
                        height: Math.max(barH, 4),
                        backgroundColor: day.isFuture ? Brand.border : Brand.primary,
                        opacity: day.isFuture ? 1 : day.ml >= 2000 ? 1 : 0.45,
                      },
                    ]}
                  />
                  <Text style={[styles.dayLbl, day.isToday && { color: Brand.primary }]}>
                    {day.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.background },

  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: Brand.border,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarImg: { width: 64, height: 64 },
  profileName: { fontSize: 20, fontWeight: '900', color: Brand.text },
  profileJoined: { fontSize: 12, color: Brand.textMuted, fontWeight: '600', marginTop: 2 },
  editBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 20,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: Brand.textMuted },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: Brand.text },
  statLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },

  levelCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 18,
    padding: 16,
  },
  levelTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  levelName: { fontSize: 18, fontWeight: '900', color: Brand.text, marginBottom: 12 },
  xpBarBg: {
    height: 14,
    backgroundColor: Brand.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 20,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  xpLbl: { fontSize: 11, fontWeight: '700', color: Brand.textMuted },

  weeklyCard: {
    margin: 16,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 18,
    padding: 16,
  },
  weeklyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  dayBars: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-end',
    height: 80,
  },
  dayBarWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    height: '100%',
  },
  dayBar: { width: '100%', borderRadius: 6 },
  dayLbl: { fontSize: 10, fontWeight: '700', color: Brand.textMuted },
});
