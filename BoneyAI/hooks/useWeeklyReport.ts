import { useMemo } from 'react';

import { formatIDR, WEEKLY_SPENDING } from '@/constants/dummy';
import { getMood } from '@/constants/moods';

export const useWeeklyReport = () =>
  useMemo(() => {
    const maxAmount = Math.max(...WEEKLY_SPENDING.map((item) => item.amount));
    const negative = WEEKLY_SPENDING.filter((item) => ['anxious', 'sad', 'angry', 'frustrated'].includes(item.moodKey));
    const stable = WEEKLY_SPENDING.filter((item) => ['happy', 'calm', 'neutral'].includes(item.moodKey));
    const average = (items: typeof WEEKLY_SPENDING) => items.reduce((sum, item) => sum + item.amount, 0) / items.length;
    const correlation = average(negative) / average(stable);

    return {
      maxAmount,
      correlation: Number(correlation.toFixed(1)),
      total: WEEKLY_SPENDING.reduce((sum, item) => sum + item.amount, 0),
      bars: WEEKLY_SPENDING.map((item) => ({
        ...item,
        label: formatIDR(item.amount).replace('Rp', 'Rp '),
        mood: getMood(item.moodKey),
        heightPercent: item.amount / maxAmount,
      })),
      dateRange: '13-19 May',
    };
  }, []);
