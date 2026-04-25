import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// ─── Drink-Typen ──────────────────────────────────────────────────────
export const DRINK_TYPES = [
  { name: 'Wasser',   emoji: '💧', factor: 1.0  },
  { name: 'Tee',      emoji: '🍵', factor: 0.9  },
  { name: 'Saft',     emoji: '🍹', factor: 0.7  },
  { name: 'Kaffee',   emoji: '☕', factor: 0.5  },
  { name: 'Milch',    emoji: '🥛', factor: 0.8  },
  { name: 'Smoothie', emoji: '🥤', factor: 0.75 },
] as const;

function getDrinkMeta(name: string) {
  return DRINK_TYPES.find((d) => d.name === name) ?? DRINK_TYPES[0];
}

// ─── Typen ────────────────────────────────────────────────────────────
export type DrinkLog = {
  id: string;
  name: string;
  emoji: string;
  ml: number;      // tatsächliches Volumen (= menge_ml in DB)
  waterMl: number; // effektives Wasser = ml × factor (berechnet im Frontend)
  time: string;    // HH:MM
};

type WaterState = {
  logs: DrinkLog[];
  totalWaterMl: number;
  goalMl: number;
  streak: number;
  score: number;
  goalReached: boolean;
  showSuccess: boolean;
  isLoading: boolean;
  weeklyMl: number[]; // 7 Werte: Mo=0 … So=6
  addLog: (name: string, emoji: string, ml: number, waterMl: number, time: string) => Promise<void>;
  dismissSuccess: () => void;
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────
const GOAL_ML = 2000;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function todayMidnightISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function mondayMidnightISO() {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7; // Tage seit Montag
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Context ──────────────────────────────────────────────────────────
const WaterContext = createContext<WaterState | undefined>(undefined);

export function WaterProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [logs, setLogs]               = useState<DrinkLog[]>([]);
  const [streak, setStreak]           = useState(0);
  const [score, setScore]             = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [weeklyMl, setWeeklyMl]       = useState<number[]>(new Array(7).fill(0));

  // Refs für addLog (vermeiden veraltete Closure-Werte)
  const goalRewardedRef  = useRef(false);
  const firstEntryRef    = useRef(true);
  const currentLogsRef   = useRef<DrinkLog[]>([]);
  const streakRef        = useRef(0);
  const scoreRef         = useRef(0);
  const artIdByName      = useRef<Map<string, number>>(new Map());
  const artNameById      = useRef<Map<number, string>>(new Map());

  useEffect(() => { currentLogsRef.current = logs;   }, [logs]);
  useEffect(() => { streakRef.current      = streak; }, [streak]);
  useEffect(() => { scoreRef.current       = score;  }, [score]);

  // ─── Init ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setLogs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    (async () => {
      try {
        await ensureDrinkTypes(userId);
        await Promise.all([
          fetchTodayLogs(userId),
          fetchUserStats(userId),
          fetchWeekData(userId),
        ]);
      } catch (e) {
        console.warn('WaterContext init:', e);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Getränkearten: 6 Standard-Typen für User sicherstellen ───────
  async function ensureDrinkTypes(uid: string) {
    const { data: existing, error } = await supabase
      .from('Getränkearten')
      .select('id, name')
      .eq('userid', uid);

    if (error) throw error;

    const existingNames = new Set((existing ?? []).map((e: any) => e.name as string));
    for (const e of existing ?? []) {
      artIdByName.current.set(e.name, e.id);
      artNameById.current.set(e.id, e.name);
    }

    const missing = DRINK_TYPES
      .filter((d) => !existingNames.has(d.name))
      .map((d) => ({ name: d.name, userid: uid }));

    if (missing.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('Getränkearten')
        .insert(missing)
        .select('id, name');
      if (insErr) throw insErr;
      for (const row of inserted ?? []) {
        artIdByName.current.set(row.name, row.id);
        artNameById.current.set(row.id, row.name);
      }
    }
  }

  // ─── Heutige Getränke aus Supabase laden ──────────────────────────
  async function fetchTodayLogs(uid: string) {
    const { data, error } = await supabase
      .from('Getränke')
      .select('id, menge_ml, uhrzeit, artid')
      .eq('userid', uid)
      .gte('uhrzeit', todayMidnightISO())
      .order('uhrzeit', { ascending: false });

    if (error) throw error;

    const fetched: DrinkLog[] = (data ?? []).map((row: any) => {
      const name    = artNameById.current.get(row.artid) ?? 'Wasser';
      const meta    = getDrinkMeta(name);
      const waterMl = Math.round(row.menge_ml * meta.factor);
      return {
        id:      String(row.id),
        name,
        emoji:   meta.emoji,
        ml:      row.menge_ml,
        waterMl,
        time: new Date(row.uhrzeit).toLocaleTimeString('de-DE', {
          hour: '2-digit', minute: '2-digit',
        }),
      };
    });

    const total = fetched.reduce((s, l) => s + l.waterMl, 0);
    goalRewardedRef.current = total >= GOAL_ML;
    firstEntryRef.current   = fetched.length === 0;
    setLogs(fetched);
  }

  // ─── Streak + Score aus user_stats laden ──────────────────────────
  async function fetchUserStats(uid: string) {
    const { data, error } = await supabase
      .from('user_stats')
      .select('streak, score, last_active_date, goal_rewarded_date')
      .eq('userid', uid)
      .maybeSingle();

    if (error) throw error;

    const today = todayStr();

    if (!data) {
      // Erster Login: Zeile anlegen
      await supabase
        .from('user_stats')
        .insert({ userid: uid, streak: 0, score: 0 });
      setStreak(0);
      setScore(0);
      return;
    }

    // Streak-Kontinuität prüfen
    let currentStreak = data.streak ?? 0;
    const lastDate    = data.last_active_date as string | null;

    if (lastDate && lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);

      if (lastDate !== yStr) {
        // Mehr als einen Tag ausgelassen → Streak zurücksetzen
        currentStreak = 0;
        await supabase
          .from('user_stats')
          .update({ streak: 0 })
          .eq('userid', uid);
      }
    }

    // Tagesziel-Bonus: wurde er heute schon vergeben?
    goalRewardedRef.current = data.goal_rewarded_date === today;

    setStreak(currentStreak);
    setScore(data.score ?? 0);
  }

  // ─── Wochendaten für den Graphen ──────────────────────────────────
  async function fetchWeekData(uid: string) {
    const { data, error } = await supabase
      .from('Getränke')
      .select('menge_ml, uhrzeit, artid')
      .eq('userid', uid)
      .gte('uhrzeit', mondayMidnightISO());
    if (error) throw error;
    const daily = new Array(7).fill(0);
    for (const row of data ?? []) {
      const date = new Date(row.uhrzeit);
      const dayIdx = (date.getDay() + 6) % 7; // Mo=0 … So=6
      const name = artNameById.current.get(row.artid) ?? 'Wasser';
      const meta = getDrinkMeta(name);
      daily[dayIdx] += Math.round(row.menge_ml * meta.factor);
    }
    setWeeklyMl(daily);
  }

  // ─── addLog ───────────────────────────────────────────────────────
  const addLog = useCallback(
    async (name: string, emoji: string, ml: number, waterMl: number, time: string) => {
      if (!userId) return;

      const artid = artIdByName.current.get(name);
      if (artid == null) {
        console.warn('addLog: artid nicht gefunden für', name);
        return;
      }

      // Getränke-Eintrag in Supabase speichern
      const { data: inserted, error } = await supabase
        .from('Getränke')
        .insert({ menge_ml: ml, uhrzeit: new Date().toISOString(), artid, userid: userId })
        .select('id')
        .single();

      if (error) {
        console.warn('addLog: Supabase-Fehler', error);
        return;
      }

      const entry: DrinkLog = {
        id: String(inserted.id),
        name,
        emoji,
        ml,
        waterMl,
        time: time || nowStr(),
      };

      // Neue Werte berechnen (mit Refs für aktuelle Werte)
      const currentTotal    = currentLogsRef.current.reduce((s, l) => s + l.waterMl, 0);
      const newTotal        = currentTotal + waterMl;
      const goalJustReached = newTotal >= GOAL_ML && !goalRewardedRef.current;
      const isFirstToday    = firstEntryRef.current;
      const today           = todayStr();

      const newStreak = isFirstToday ? streakRef.current + 1 : streakRef.current;
      const newScore  = scoreRef.current + 10 + (goalJustReached ? 50 : 0);

      if (goalJustReached) goalRewardedRef.current = true;
      if (isFirstToday)    firstEntryRef.current   = false;

      // user_stats in Supabase aktualisieren
      await supabase
        .from('user_stats')
        .upsert(
          {
            userid:            userId,
            streak:            newStreak,
            score:             newScore,
            last_active_date:  today,
            ...(goalJustReached ? { goal_rewarded_date: today } : {}),
          },
          { onConflict: 'userid' },
        );

      // Lokalen State aktualisieren
      setLogs((prev) => [entry, ...prev]);
      setStreak(newStreak);
      setScore(newScore);
      if (goalJustReached) setShowSuccess(true);

      const todayIdx = (new Date().getDay() + 6) % 7;
      setWeeklyMl((prev) => {
        const next = [...prev];
        next[todayIdx] = (next[todayIdx] ?? 0) + waterMl;
        return next;
      });
    },
    [userId],
  );

  const dismissSuccess = useCallback(() => setShowSuccess(false), []);

  const totalWaterMl = useMemo(() => logs.reduce((s, l) => s + l.waterMl, 0), [logs]);
  const goalReached  = totalWaterMl >= GOAL_ML;

  const value = useMemo<WaterState>(
    () => ({
      logs,
      totalWaterMl,
      goalMl: GOAL_ML,
      streak,
      score,
      goalReached,
      showSuccess,
      isLoading,
      weeklyMl,
      addLog,
      dismissSuccess,
    }),
    [logs, totalWaterMl, streak, score, goalReached, showSuccess, isLoading, weeklyMl, addLog, dismissSuccess],
  );

  return <WaterContext.Provider value={value}>{children}</WaterContext.Provider>;
}

export function useWater() {
  const ctx = useContext(WaterContext);
  if (!ctx) throw new Error('useWater must be used within WaterProvider');
  return ctx;
}
