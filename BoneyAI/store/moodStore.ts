import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { SEED_MOOD_HISTORY, todayISO } from '@/constants/dummy';
import { MoodEntry } from '@/constants/moods';

interface MoodStore {
  entries: MoodEntry[];
  todayEntry: MoodEntry | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addEntry: (entry: MoodEntry) => void;
  getEntriesForMonth: (year: number, month: number) => MoodEntry[];
}

const STORAGE_KEY = 'boney-mood-store';
const currentTodayEntry = (entries: MoodEntry[]) => entries.find((entry) => entry.date === todayISO()) ?? null;

const persistEntries = async (entries: MoodEntry[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Persistence should never block a mood check-in.
  }
};

export const useMoodStore = create<MoodStore>((set, get) => ({
  entries: SEED_MOOD_HISTORY,
  todayEntry: currentTodayEntry(SEED_MOOD_HISTORY),
  isHydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries = raw ? (JSON.parse(raw) as MoodEntry[]) : SEED_MOOD_HISTORY;
      set({ entries, todayEntry: currentTodayEntry(entries), isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },
  addEntry: (entry) =>
    set((state) => {
      const entries = [entry, ...state.entries.filter((item) => item.date !== entry.date)];
      void persistEntries(entries);
      return { entries, todayEntry: currentTodayEntry(entries) };
    }),
  getEntriesForMonth: (year, month) =>
    get().entries.filter((entry) => {
      const [entryYear, entryMonth] = entry.date.split('-').map(Number);
      return entryYear === year && entryMonth === month + 1;
    }),
}));
