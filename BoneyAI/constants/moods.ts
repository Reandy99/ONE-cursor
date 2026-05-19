import { Colors } from './tokens';

export type MoodKey =
  | 'happy'
  | 'calm'
  | 'neutral'
  | 'tired'
  | 'sad'
  | 'anxious'
  | 'frustrated'
  | 'angry';

export interface Mood {
  key: MoodKey;
  emoji: string;
  label: string;
  score: number;
  color: string;
}

export const MOODS: Mood[] = [
  { key: 'happy', emoji: '😄', label: 'Happy', score: 9, color: Colors.mood.happy },
  { key: 'calm', emoji: '😌', label: 'Calm', score: 8, color: Colors.mood.calm },
  { key: 'neutral', emoji: '😐', label: 'Neutral', score: 5, color: Colors.mood.neutral },
  { key: 'tired', emoji: '😴', label: 'Tired', score: 4, color: Colors.mood.tired },
  { key: 'sad', emoji: '😔', label: 'Sad', score: 3, color: Colors.mood.sad },
  { key: 'anxious', emoji: '😰', label: 'Anxious', score: 3, color: Colors.mood.anxious },
  { key: 'frustrated', emoji: '😤', label: 'Frustrated', score: 2, color: Colors.mood.frustrated },
  { key: 'angry', emoji: '😡', label: 'Angry', score: 1, color: Colors.mood.angry },
];

export interface MoodEntry {
  date: string;
  moodKey: MoodKey;
  note?: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  amount: number;
  moodKey: MoodKey;
  time: string;
  date: string;
  category: 'F&B' | 'Shopping' | 'Transport' | 'Subscription' | 'Other';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: 'listen' | 'humor' | 'solution';
  timestamp: Date;
}

export const getMood = (key: MoodKey) => MOODS.find((mood) => mood.key === key) ?? MOODS[2];
