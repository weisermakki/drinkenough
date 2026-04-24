import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { Brand } from '@/constants/brand';
import { DuoButton } from './DuoButton';

const TIPS = [
  'Wasser hilft deinen Nieren, Abfallprodukte aus dem Blut zu filtern.',
  'Schon 1–2% Dehydrierung können Konzentration und Stimmung senken.',
  'Morgens ein großes Glas Wasser kurbelt den Stoffwechsel an.',
  'Ausreichend Wasser trinken kann Kopfschmerzen vorbeugen.',
  'Wasser enthält keine Kalorien – der beste Durstlöscher!',
];

type Props = { onDismiss: () => void };

export function SuccessOverlay({ onDismiss }: Props) {
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withDelay(
      200,
      withSequence(
        withSpring(1.1, { damping: 8 }),
        withSpring(1, { damping: 12 }),
      ),
    );
  }, [opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const mascotWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.overlay, containerStyle]}>
      <Animated.View style={mascotWrapStyle}>
        <Image
          source={require('@/assets/images/tropfen.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.title}>Top, du lebst gesund! 🎉</Text>
      <Text style={styles.sub}>Du hast dein Tagesziel von 2000 ml erreicht!</Text>

      <View style={styles.tipCard}>
        <Text style={styles.tipLabel}>TIPP DES TAGES</Text>
        <Text style={styles.tipText}>{tip}</Text>
      </View>

      <DuoButton title="WEITER" onPress={onDismiss} variant="success" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Brand.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: Brand.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  tipCard: {
    width: '100%',
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text,
    lineHeight: 21,
  },
});
