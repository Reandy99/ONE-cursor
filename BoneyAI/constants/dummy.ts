import { ChatMessage, MoodEntry, MoodKey, Receipt } from './moods';

const pad = (value: number) => String(value).padStart(2, '0');

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = () => toISODate(new Date());

const dateFromOffset = (offset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toISODate(date);
};

const moodCycle: MoodKey[] = [
  'happy',
  'calm',
  'happy',
  'neutral',
  'tired',
  'sad',
  'anxious',
  'frustrated',
  'calm',
  'happy',
  'neutral',
  'tired',
  'sad',
  'anxious',
  'angry',
];

export const SEED_MOOD_HISTORY: MoodEntry[] = Array.from({ length: 30 }, (_, index) => {
  const offset = index - 30;
  const moodKey = moodCycle[index % moodCycle.length];
  return {
    date: dateFromOffset(offset),
    moodKey,
    note:
      moodKey === 'anxious'
        ? 'A lot of notifications today. Boney noticed extra browsing at night.'
        : moodKey === 'sad'
          ? 'Needed comfort after a long day.'
          : undefined,
  };
});

export const RECEIPTS_TODAY: Receipt[] = [
  { id: '1', merchant: 'Starbucks · Cold Brew', amount: 65000, moodKey: 'anxious', time: '14:23', date: todayISO(), category: 'F&B' },
  { id: '2', merchant: 'Tokopedia · skincare', amount: 285000, moodKey: 'sad', time: '21:10', date: todayISO(), category: 'Shopping' },
  { id: '3', merchant: 'Grab ke kantor', amount: 35000, moodKey: 'tired', time: '08:45', date: todayISO(), category: 'Transport' },
];

export const SEED_RECEIPTS: Receipt[] = [
  ...RECEIPTS_TODAY,
  { id: '4', merchant: 'Netflix', amount: 54000, moodKey: 'neutral', time: '09:02', date: dateFromOffset(-1), category: 'Subscription' },
  { id: '5', merchant: 'Sushi Hiro', amount: 188000, moodKey: 'happy', time: '19:35', date: dateFromOffset(-2), category: 'F&B' },
  { id: '6', merchant: 'Uniqlo · linen shirt', amount: 399000, moodKey: 'anxious', time: '20:42', date: dateFromOffset(-3), category: 'Shopping' },
  { id: '7', merchant: 'MRT Jakarta', amount: 14000, moodKey: 'calm', time: '08:20', date: dateFromOffset(-4), category: 'Transport' },
];

export const WEEKLY_SPENDING = [
  { day: 'Mon', amount: 82000, moodKey: 'calm' as MoodKey },
  { day: 'Tue', amount: 116000, moodKey: 'neutral' as MoodKey },
  { day: 'Wed', amount: 268000, moodKey: 'anxious' as MoodKey },
  { day: 'Thu', amount: 74000, moodKey: 'tired' as MoodKey },
  { day: 'Fri', amount: 98000, moodKey: 'happy' as MoodKey },
  { day: 'Sat', amount: 121000, moodKey: 'happy' as MoodKey },
  { day: 'Sun', amount: 310000, moodKey: 'sad' as MoodKey },
];

export const SEED_CHAT: ChatMessage[] = [
  {
    id: '0',
    role: 'assistant',
    text: 'Hi! Aku Boney 👋 Aku di sini untuk bantu kamu memahami pola mood dan pengeluaranmu. Mau cerita apa hari ini?',
    mode: 'listen',
    timestamp: new Date(),
  },
];

export const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
