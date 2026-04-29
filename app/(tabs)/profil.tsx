import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useWater, DRINK_TYPES } from '@/contexts/WaterContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const GOAL = 2000;

type DayData = {
  label: string;
  ml: number;
  isFuture: boolean;
  isToday: boolean;
};

function DashedLine({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', flex: 1, overflow: 'hidden', height: 2 }}>
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} style={{ width: 5, height: 2, backgroundColor: color, marginRight: 3 }} />
      ))}
    </View>
  );
}

function WeekChart({
  data,
  chartH,
  maxMl,
  avgMl,
  onBarPress,
}: {
  data: DayData[];
  chartH: number;
  maxMl: number;
  avgMl: number;
  onBarPress?: (d: DayData) => void;
}) {
  const avgBottom = maxMl > 0 ? (avgMl / maxMl) * chartH : 0;

  return (
    <View>
      <View style={{ height: chartH, position: 'relative' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            height: chartH,
            gap: 6,
            position: 'absolute',
            left: 0,
            right: 0,
          }}>
          {data.map((day) => {
            const barH = day.isFuture
              ? 0
              : day.ml === 0
                ? 4
                : Math.max((day.ml / maxMl) * chartH, 8);
            const bgColor = !day.isFuture && day.ml > 0 ? Brand.primary : Brand.border;
            const opacity = day.isFuture ? 0.2 : day.ml === 0 ? 0.4 : day.ml >= GOAL ? 1 : 0.55;

            const bar = (
              <View
                style={{ width: '100%', height: barH, backgroundColor: bgColor, opacity, borderRadius: 6 }}
              />
            );

            return onBarPress ? (
              <TouchableOpacity
                key={day.label}
                style={{ flex: 1, height: chartH, justifyContent: 'flex-end' }}
                onPress={() => onBarPress(day)}
                activeOpacity={0.7}>
                {bar}
              </TouchableOpacity>
            ) : (
              <View key={day.label} style={{ flex: 1, height: chartH, justifyContent: 'flex-end' }}>
                {bar}
              </View>
            );
          })}
        </View>

        {avgMl > 0 && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: Math.max(Math.round(avgBottom) - 1, 0),
              height: 2,
              flexDirection: 'row',
            }}
            pointerEvents="none">
            <DashedLine color={Brand.warning} />
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {data.map((day) => (
          <Text
            key={day.label}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10,
              fontWeight: '700',
              color: day.isToday ? Brand.primary : Brand.textMuted,
            }}>
            {day.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function getWeekStart(offset: number): string {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getWeekLabel(offset: number): string {
  if (offset === 0) return 'DIESE WOCHE';
  if (offset === -1) return 'LETZTE WOCHE';
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff + offset * 7);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `WOCHE VOM ${day}.${month}.`;
}

export default function ProfilScreen() {
  const { score, streak, totalWaterMl, weeklyMl } = useWater();
  const { session, signOut } = useAuth();

  const userId = session?.user?.id ?? null;

  const [chartModal, setChartModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [historicWeeklyMl, setHistoricWeeklyMl] = useState<number[] | null>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [artMap, setArtMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('Getränkearten')
      .select('id, name')
      .eq('userid', userId)
      .then(({ data }) => {
        const map = new Map<number, string>();
        for (const row of data ?? []) map.set(row.id, row.name);
        setArtMap(map);
      });
  }, [userId]);

  useEffect(() => {
    if (weekOffset === 0) {
      setHistoricWeeklyMl(null);
      return;
    }
    if (!userId || artMap.size === 0) return;

    setIsLoadingWeek(true);
    const from = getWeekStart(weekOffset);
    const to = getWeekStart(weekOffset + 1);

    supabase
      .from('Getränke')
      .select('menge_ml, uhrzeit, artid')
      .eq('userid', userId)
      .gte('uhrzeit', from)
      .lt('uhrzeit', to)
      .then(({ data }) => {
        const daily = new Array(7).fill(0);
        for (const row of data ?? []) {
          const date = new Date(row.uhrzeit);
          const dayIdx = (date.getDay() + 6) % 7;
          const name = artMap.get(row.artid) ?? 'Wasser';
          const meta = DRINK_TYPES.find((d) => d.name === name) ?? DRINK_TYPES[0];
          daily[dayIdx] += Math.round(row.menge_ml * meta.factor);
        }
        setHistoricWeeklyMl(daily);
        setIsLoadingWeek(false);
      });
  }, [weekOffset, userId, artMap]);

  const levelInfo = getLevel(score);
  const xpPct = Math.min(levelInfo.currentXp / levelInfo.neededXp, 1);
  const daysActive = Math.max(streak, 1);
  const email = session?.user?.email ?? '';
  const name = email.split('@')[0];
  const totalLiters = (totalWaterMl / 1000).toFixed(1);

  const todayDayIdx = (new Date().getDay() + 6) % 7;
  const displayWeeklyMl = weekOffset === 0 ? weeklyMl : (historicWeeklyMl ?? new Array(7).fill(0));

  const weekData: DayData[] = displayWeeklyMl.map((ml, i) => ({
    label: DAY_LABELS[i],
    ml: weekOffset === 0 ? (i > todayDayIdx ? 0 : ml) : ml,
    isFuture: weekOffset === 0 && i > todayDayIdx,
    isToday: weekOffset === 0 && i === todayDayIdx,
  }));

  const nonFuture = weekData.filter((d) => !d.isFuture);
  const avgMl =
    nonFuture.length > 0
      ? Math.round(nonFuture.reduce((s, d) => s + d.ml, 0) / nonFuture.length)
      : 0;
  const maxMl = Math.max(...weekData.map((d) => d.ml), 500);

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
        {/* Profil-Header */}
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

        {/* Stats-Reihe */}
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

        {/* Level-Karte */}
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
              <Text style={styles.xpLbl}>
                {levelInfo.neededXp} XP für Level {levelInfo.level + 1}
              </Text>
            )}
          </View>
        </View>

        {/* Wochen-Graph */}
        <TouchableOpacity
          style={styles.weeklyCard}
          onPress={() => {
            setSelectedDay(null);
            setChartModal(true);
          }}
          activeOpacity={0.85}>
          {/* Wochen-Navigation */}
          <View style={styles.weeklyCardHeader}>
            <View style={styles.weekNavRow}>
              <TouchableOpacity
                onPress={() => {
                  setWeekOffset((o) => o - 1);
                  setSelectedDay(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.weekNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.weeklyTitle}>{getWeekLabel(weekOffset)}</Text>
              <TouchableOpacity
                onPress={() => {
                  setWeekOffset((o) => o + 1);
                  setSelectedDay(null);
                }}
                disabled={weekOffset === 0}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.weekNavArrow, weekOffset === 0 && styles.weekNavArrowDisabled]}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.avgLegend}>
              <View style={styles.avgDashSample}>
                <DashedLine color={Brand.warning} />
              </View>
              <Text style={styles.avgLegendText}>⌀ {avgMl} ml</Text>
            </View>
          </View>
          {isLoadingWeek ? (
            <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: Brand.textMuted, fontSize: 12, fontWeight: '600' }}>Lädt...</Text>
            </View>
          ) : (
            <WeekChart data={weekData} chartH={80} maxMl={maxMl} avgMl={avgMl} />
          )}
          <Text style={styles.tapHint}>Tippen für Detailansicht →</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Detail-Modal */}
      <Modal
        visible={chartModal}
        transparent
        animationType="slide"
        onRequestClose={() => setChartModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <TouchableOpacity
                  onPress={() => {
                    setWeekOffset((o) => o - 1);
                    setSelectedDay(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.modalNavArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{getWeekLabel(weekOffset)}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setWeekOffset((o) => o + 1);
                    setSelectedDay(null);
                  }}
                  disabled={weekOffset === 0}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.modalNavArrow, weekOffset === 0 && styles.weekNavArrowDisabled]}>›</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setChartModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Durchschnitts-Legende */}
            <View style={styles.modalAvgRow}>
              <View style={styles.modalAvgDash}>
                <DashedLine color={Brand.warning} />
              </View>
              <Text style={styles.modalAvgText}>Wochendurchschnitt: {avgMl} ml/Tag</Text>
            </View>

            {/* Großer Graph */}
            {isLoadingWeek ? (
              <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: Brand.textMuted, fontSize: 13, fontWeight: '600' }}>Lädt...</Text>
              </View>
            ) : (
              <WeekChart
                data={weekData}
                chartH={180}
                maxMl={maxMl}
                avgMl={avgMl}
                onBarPress={setSelectedDay}
              />
            )}

            {/* Tages-Detail */}
            {selectedDay ? (
              <View style={styles.dayDetailCard}>
                <Text style={styles.dayDetailDay}>{selectedDay.label}</Text>
                <Text style={styles.dayDetailMl}>
                  {selectedDay.isFuture
                    ? '–'
                    : selectedDay.ml === 0
                      ? 'Nichts getrunken'
                      : `${selectedDay.ml} ml`}
                </Text>
                {!selectedDay.isFuture && selectedDay.ml > 0 && (
                  <Text style={styles.dayDetailGoal}>
                    {selectedDay.ml >= GOAL
                      ? '✓ Tagesziel erreicht'
                      : `Noch ${GOAL - selectedDay.ml} ml bis zum Ziel`}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.tapHintModal}>Tippe auf einen Balken für Details</Text>
            )}
          </View>
        </View>
      </Modal>
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
  xpBarBg: { height: 14, backgroundColor: Brand.border, borderRadius: 20, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 20 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  xpLbl: { fontSize: 11, fontWeight: '700', color: Brand.textMuted },

  weeklyCard: {
    margin: 16,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 18,
    padding: 16,
  },
  weeklyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  weekNavArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: Brand.primary,
    lineHeight: 26,
  },
  weekNavArrowDisabled: {
    color: Brand.border,
  },
  avgLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgDashSample: { width: 20, overflow: 'hidden', height: 2 },
  avgLegendText: { fontSize: 11, fontWeight: '700', color: Brand.warning },
  tapHint: {
    fontSize: 11,
    color: Brand.textMuted,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Brand.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Brand.text },
  modalNavArrow: {
    fontSize: 26,
    fontWeight: '700',
    color: Brand.primary,
    lineHeight: 30,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 14, fontWeight: '700', color: Brand.textMuted },

  modalAvgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalAvgDash: { width: 28, overflow: 'hidden', height: 2 },
  modalAvgText: { fontSize: 12, fontWeight: '700', color: Brand.warning },

  dayDetailCard: {
    marginTop: 16,
    backgroundColor: Brand.selectedBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Brand.primary + '40',
    padding: 16,
    alignItems: 'center',
  },
  dayDetailDay: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayDetailMl: { fontSize: 30, fontWeight: '900', color: Brand.primary, marginTop: 4 },
  dayDetailGoal: { fontSize: 12, fontWeight: '700', color: Brand.textMuted, marginTop: 4 },
  tapHintModal: {
    fontSize: 12,
    color: Brand.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
});
