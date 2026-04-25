import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { DuoButton } from '@/components/water/DuoButton';
import { DRINK_TYPES, useWater } from '@/contexts/WaterContext';

const DRINKS = DRINK_TYPES;
const PRESETS = [100, 200, 250, 330, 500, 750];

const ITEM_H = 52;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function clampIdx(y: number, max: number) {
  return Math.max(0, Math.min(max - 1, Math.round(y / ITEM_H)));
}

function TimePickerModal({
  visible,
  initial,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  initial: string;
  onConfirm: (t: string) => void;
  onDismiss: () => void;
}) {
  const [selH, setSelH] = useState(0);
  const [selM, setSelM] = useState(0);
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const h = parseInt(initial.split(':')[0], 10);
    const m = parseInt(initial.split(':')[1], 10);
    setSelH(h);
    setSelM(m);
    const timer = setTimeout(() => {
      hourRef.current?.scrollTo({ y: h * ITEM_H, animated: false });
      minuteRef.current?.scrollTo({ y: m * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [visible, initial]);

  function confirm() {
    onConfirm(`${String(selH).padStart(2, '0')}:${String(selM).padStart(2, '0')}`);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerTitle}>Uhrzeit wählen</Text>

          <View style={styles.pickerWrap}>
            {/* Center highlight bar */}
            <View style={styles.selBar} pointerEvents="none" />

            {/* Hours */}
            <ScrollView
              ref={hourRef}
              style={styles.pickerCol}
              snapToInterval={ITEM_H}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.colContent}
              onScrollEndDrag={(e) => setSelH(clampIdx(e.nativeEvent.contentOffset.y, 24))}
              onMomentumScrollEnd={(e) => setSelH(clampIdx(e.nativeEvent.contentOffset.y, 24))}
            >
              {HOURS.map((h) => (
                <View key={h} style={styles.pickerItem}>
                  <Text style={[styles.pickerItemText, h === selH && styles.pickerItemActive]}>
                    {String(h).padStart(2, '0')}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.pickerColon}>:</Text>

            {/* Minutes */}
            <ScrollView
              ref={minuteRef}
              style={styles.pickerCol}
              snapToInterval={ITEM_H}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.colContent}
              onScrollEndDrag={(e) => setSelM(clampIdx(e.nativeEvent.contentOffset.y, 60))}
              onMomentumScrollEnd={(e) => setSelM(clampIdx(e.nativeEvent.contentOffset.y, 60))}
            >
              {MINUTES.map((m) => (
                <View key={m} style={styles.pickerItem}>
                  <Text style={[styles.pickerItemText, m === selM && styles.pickerItemActive]}>
                    {String(m).padStart(2, '0')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.pickerActions}>
            <TouchableOpacity onPress={onDismiss} style={styles.pickerCancelBtn}>
              <Text style={styles.pickerCancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} style={styles.pickerConfirmBtn}>
              <Text style={styles.pickerConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function HinzufuegenScreen() {
  const router = useRouter();
  const { addLog } = useWater();

  const [selectedDrink, setSelectedDrink] = useState(0);
  const [amount, setAmount] = useState(250);
  const [time, setTime] = useState(nowStr());
  const [added, setAdded] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  function handleAdd() {
    const drink = DRINKS[selectedDrink];
    const waterMl = Math.round(amount * drink.factor);
    addLog(drink.name, drink.emoji, amount, waterMl, time);
    setAdded(true);
    setTimeout(() => router.back(), 400);
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
                <Text style={[styles.drinkLabel, i === selectedDrink && styles.drinkLabelSelected]}>
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
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}>
              <Text style={styles.timeIcon}>🕐</Text>
              <Text style={styles.timeValue}>{time}</Text>
              <Text style={styles.timeChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Factor hint */}
          <Text style={styles.factorHint}>
            Effektiv: {Math.round(amount * DRINKS[selectedDrink].factor)} ml Wasser
            {DRINKS[selectedDrink].factor < 1 && ` (×${DRINKS[selectedDrink].factor})`}
          </Text>

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

      <TimePickerModal
        visible={pickerVisible}
        initial={time}
        onConfirm={(t) => {
          setTime(t);
          setPickerVisible(false);
        }}
        onDismiss={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.background },
  scroll: { flex: 1 },
  screen: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 32 },

  header: { marginBottom: 16, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: Brand.text },
  subtitle: { fontSize: 13, color: Brand.textMuted, fontWeight: '600', marginTop: 2 },

  drinkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
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
  drinkOptionSelected: { borderColor: Brand.primary, backgroundColor: Brand.selectedBg },
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

  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  adjustBar: { flex: 1, height: 10, backgroundColor: Brand.border, borderRadius: 5, overflow: 'hidden' },
  adjustFill: { height: '100%', backgroundColor: Brand.primary, borderRadius: 5 },

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
  timeValue: { flex: 1, fontSize: 16, fontWeight: '700', color: Brand.text },
  timeChevron: { fontSize: 22, color: Brand.textMuted, fontWeight: '300' },

  factorHint: {
    fontSize: 12,
    color: Brand.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  addBtn: { marginBottom: 10 },
  cancelBtn: {},

  // TimePicker Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBox: {
    width: 300,
    backgroundColor: Brand.background,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: VISIBLE * ITEM_H,
    position: 'relative',
  },
  selBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD * ITEM_H,
    height: ITEM_H,
    backgroundColor: Brand.selectedBg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Brand.primary + '40',
  },
  pickerCol: { flex: 1 },
  colContent: { paddingVertical: PAD * ITEM_H },
  pickerItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  pickerItemText: { fontSize: 22, fontWeight: '600', color: Brand.textMuted },
  pickerItemActive: { fontSize: 26, fontWeight: '900', color: Brand.primary },
  pickerColon: { fontSize: 26, fontWeight: '900', color: Brand.text, paddingHorizontal: 6 },
  pickerActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  pickerCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: Brand.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Brand.border,
  },
  pickerCancelText: { fontSize: 15, fontWeight: '700', color: Brand.textMuted },
  pickerConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: Brand.primary,
    borderRadius: 14,
  },
  pickerConfirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
