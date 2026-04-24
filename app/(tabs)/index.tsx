import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing as RNEasing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { SuccessOverlay } from '@/components/water/SuccessOverlay';
import { DuoButton } from '@/components/water/DuoButton';
import { useWater, type DrinkLog } from '@/contexts/WaterContext';

const CIRCLE_SIZE = 160;

export default function DashboardScreen() {
  const { logs, totalWaterMl, goalMl, streak, score, goalReached, showSuccess, dismissSuccess } =
    useWater();
  const router = useRouter();

  // Water fill: animate to pixel height (avoids percentage-string warnings on web)
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.min(totalWaterMl / goalMl, 1) * CIRCLE_SIZE,
      duration: 800,
      easing: RNEasing.bezier(0.34, 1.56, 0.64, 1),
      useNativeDriver: false,
    }).start();
  }, [totalWaterMl, goalMl, fillAnim]);

  // Mascot float
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [floatY]);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipIcon}>🔥</Text>
            <Text style={styles.chipText}>{streak}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipIcon}>⭐</Text>
            <Text style={styles.chipText}>{score}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profil')}>
          <Image
            source={require('@/assets/images/tropfen.png')}
            style={styles.profileMascot}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Water Hero */}
        <View style={styles.waterHero}>
          {/* Circle: fill from below + Tropfen centered inside */}
          <View style={styles.waterCircleBg}>
            <Animated.View style={[styles.waterFill, { height: fillAnim }]}>
              <LinearGradient
                colors={['#7dd8f5', '#38b8eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {/* Mascot in circle center, above fill */}
            <Reanimated.View style={mascotStyle}>
              <Image
                source={require('@/assets/images/tropfen.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Reanimated.View>
          </View>

          {/* ml label below circle */}
          {goalReached ? (
            <Text style={styles.waterGoalText}>🎉 Tagesziel erreicht!</Text>
          ) : (
            <Text style={styles.waterSubLabel}>
              {totalWaterMl} / {goalMl} ml
            </Text>
          )}
        </View>

        {/* Add Button */}
        <View style={styles.addWrap}>
          <DuoButton title="+ HINZUFÜGEN" onPress={() => router.push('/hinzufuegen')} />
        </View>

        {/* Log List */}
        {logs.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Heute getrunken</Text>
            {logs.map((item) => (
              <LogItem key={item.id} item={item} />
            ))}
          </View>
        )}

        {logs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Noch nichts getrunken heute.</Text>
            <Text style={styles.emptySubtext}>Fang an – dein Körper wird es dir danken! 💧</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {showSuccess && <SuccessOverlay onDismiss={dismissSuccess} />}
    </SafeAreaView>
  );
}

function LogItem({ item }: { item: DrinkLog }) {
  return (
    <View style={styles.logItem}>
      <View style={styles.logIcon}>
        <Text style={styles.logEmoji}>{item.emoji}</Text>
      </View>
      <View style={styles.logInfo}>
        <Text style={styles.logName}>{item.name}</Text>
        <Text style={styles.logTime}>{item.time} Uhr</Text>
      </View>
      <Text style={styles.logMl}>+{item.waterMl} ml</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
    backgroundColor: '#fff',
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Brand.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipIcon: { fontSize: 16 },
  chipText: { fontSize: 14, fontWeight: '800', color: Brand.text },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileMascot: { width: 30, height: 30 },

  scroll: { flex: 1 },

  waterHero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    gap: 8,
  },
  waterCircleBg: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Brand.surface,
    borderWidth: 3,
    borderColor: Brand.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    overflow: 'hidden',
  },
  mascot: { width: 70, height: 70 },
  waterSubLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.textMuted,
  },
  waterGoalText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.success,
  },

  addWrap: { paddingHorizontal: 20, paddingBottom: 16 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  logIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logEmoji: { fontSize: 20 },
  logInfo: { flex: 1 },
  logName: { fontSize: 15, fontWeight: '700', color: Brand.text },
  logTime: { fontSize: 12, color: Brand.textMuted, fontWeight: '600' },
  logMl: { fontSize: 15, fontWeight: '800', color: Brand.primary },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: { fontSize: 16, fontWeight: '700', color: Brand.textMuted },
  emptySubtext: { fontSize: 14, color: Brand.textMuted, marginTop: 6, textAlign: 'center' },
});
