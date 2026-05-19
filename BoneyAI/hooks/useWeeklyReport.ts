import { useMemo } from 'react';

import { formatIDR, WEEKLY_SPENDING } from '@/constants/dummy';
import { getMood } from '@/constants/moods';

export const useWeeklyReport = () =>
  useMemo(() => {
    const maxAmount = Math.max(...WEEKLY_SPENDING.map((item) => item.amount));
    return {
      maxAmount,
      correlation: 2.3,
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
