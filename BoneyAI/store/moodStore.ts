import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_MOOD_HISTORY, todayISO } from '@/constants/dummy';
import { MoodEntry } from '@/constants/moods';

interface MoodStore {
  entries: MoodEntry[];
  todayEntry: MoodEntry | null;
  addEntry: (entry: MoodEntry) => void;
  getEntriesForMonth: (year: number, month: number) => MoodEntry[];
}

const currentTodayEntry = (entries: MoodEntry[]) => entries.find((entry) => entry.date === todayISO()) ?? null;

export const useMoodStore = create<MoodStore>()(
  persist(
    (set, get) => ({
      entries: SEED_MOOD_HISTORY,
      todayEntry: currentTodayEntry(SEED_MOOD_HISTORY),
      addEntry: (entry) =>
        set((state) => {
          const entries = [entry, ...state.entries.filter((item) => item.date !== entry.date)];
          return { entries, todayEntry: currentTodayEntry(entries) };
        }),
      getEntriesForMonth: (year, month) =>
        get().entries.filter((entry) => {
          const [entryYear, entryMonth] = entry.date.split('-').map(Number);
          return entryYear === year && entryMonth === month + 1;
        }),
    }),
    {
      name: 'boney-mood-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.todayEntry = currentTodayEntry(state.entries);
        }
      },
    },
  ),
);
