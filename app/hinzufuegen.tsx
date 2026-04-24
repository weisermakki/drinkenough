import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { DuoButton } from '@/components/water/DuoButton';
import { DRINK_TYPES, useWater } from '@/contexts/WaterContext';

const DRINKS = DRINK_TYPES;

const PRESETS = [100, 200, 250, 330, 500, 750];

function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HinzufuegenScreen() {
  const router = useRouter();
  const { addLog } = useWater();

  const [selectedDrink, setSelectedDrink] = useState(0);
  const [amount, setAmount] = useState(250);
  const [time, setTime] = useState(nowStr());
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const drink = DRINKS[selectedDrink];
    const waterMl = Math.round(amount * drink.factor);
    addLog(drink.name, drink.emoji, amount, waterMl, time);
    setAdded(true);
    setTimeout(() => {
      router.back();
    }, 400);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.screen}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Getränk hinzufügen</Text>
            <Text style={styles.subtitle}>Was hast du getrunken?</Text>
          </View>

          {/* Drink Type Grid */}
          <View style={styles.drinkGrid}>
            {DRINKS.map((drink, i) => (
              <TouchableOpacity
                key={drink.name}
                style={[styles.drinkOption, i === selectedDrink && styles.drinkOptionSelected]}
                onPress={() => setSelectedDrink(i)}
                activeOpacity={0.7}>
                <Text style={styles.drinkEmoji}>{drink.emoji}</Text>
                <Text
                  style={[
                    styles.drinkLabel,
                    i === selectedDrink && styles.drinkLabelSelected,
                  ]}>
                  {drink.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.sectionLabel}>MENGE</Text>
            <View style={styles.amountDisplay}>
              <Text style={styles.amountNumber}>{amount}</Text>
              <Text style={styles.amountUnit}> ml</Text>
            </View>

            {/* Preset Buttons */}
            <View style={styles.presets}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetBtn, amount === p && styles.presetBtnActive]}
                  onPress={() => setAmount(p)}
                  activeOpacity={0.7}>
                  <Text style={[styles.presetText, amount === p && styles.presetTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom amount buttons */}
            <View style={styles.customRow}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setAmount((a) => Math.max(50, a - 25))}>
                <Text style={styles.adjustText}>−</Text>
              </TouchableOpacity>
              <View style={styles.adjustBar}>
                <View
                  style={[
                    styles.adjustFill,
                    { width: `${Math.min(((amount - 50) / 950) * 100, 100)}%` },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setAmount((a) => Math.min(1000, a + 25))}>
                <Text style={styles.adjustText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time */}
          <View style={styles.timeSection}>
            <Text style={styles.sectionLabel}>UHRZEIT</Text>
            <View style={styles.timeInput}>
              <Text style={styles.timeIcon}>🕐</Text>
              <TextInput
                style={styles.timeField}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>

          {/* Factor hint */}
          <Text style={styles.factorHint}>
            Effektiv: {Math.round(amount * DRINKS[selectedDrink].factor)} ml Wasser
            {DRINKS[selectedDrink].factor < 1 &&
              ` (×${DRINKS[selectedDrink].factor})`}
          </Text>

          {/* Buttons */}
          <DuoButton
            title={added ? '✓ HINZUGEFÜGT!' : 'HINZUFÜGEN'}
            onPress={handleAdd}
            variant={added ? 'success' : 'primary'}
            disabled={added}
            style={styles.addBtn}
          />
          <DuoButton
            title="Abbrechen"
            onPress={() => router.back()}
            variant="ghost"
            style={styles.cancelBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.background },
  scroll: { flex: 1 },
  screen: { padding: 20 },

  header: { textAlign: 'center', marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: Brand.text },
  subtitle: { fontSize: 13, color: Brand.textMuted, fontWeight: '600', marginTop: 2 },

  drinkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  drinkOption: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    gap: 6,
  },
  drinkOptionSelected: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selectedBg,
  },
  drinkEmoji: { fontSize: 28 },
  drinkLabel: { fontSize: 12, fontWeight: '700', color: Brand.textMuted },
  drinkLabelSelected: { color: Brand.primary },

  amountSection: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 12,
  },
  amountNumber: { fontSize: 42, fontWeight: '900', color: Brand.primary, lineHeight: 48 },
  amountUnit: { fontSize: 18, color: Brand.textMuted, paddingBottom: 6 },

  presets: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  presetBtnActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  presetText: { fontSize: 13, fontWeight: '800', color: Brand.text },
  presetTextActive: { color: '#fff' },

  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: { fontSize: 20, fontWeight: '700', color: Brand.text },
  adjustBar: {
    flex: 1,
    height: 10,
    backgroundColor: Brand.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  adjustFill: {
    height: '100%',
    backgroundColor: Brand.primary,
    borderRadius: 5,
  },

  timeSection: { marginBottom: 20 },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeIcon: { fontSize: 18 },
  timeField: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text,
  },

  factorHint: {
    fontSize: 12,
    color: Brand.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },

  addBtn: { marginBottom: 10 },
  cancelBtn: {},
});
