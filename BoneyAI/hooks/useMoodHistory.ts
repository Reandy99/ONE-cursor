import { useMemo } from 'react';

import { useMoodStore } from '@/store/moodStore';

export const useMoodHistory = (monthDate = new Date()) => {
  const entries = useMoodStore((state) => state.entries);

  return useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const map = new Map(entries.map((entry) => [entry.date, entry]));
    const monthEntries = entries.filter((entry) => {
      const [entryYear, entryMonth] = entry.date.split('-').map(Number);
      return entryYear === year && entryMonth === month + 1;
    });

    return { entries, monthEntries, entryByDate: map };
  }, [entries, monthDate]);
};
