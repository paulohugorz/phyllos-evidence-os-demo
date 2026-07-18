import Storage from 'expo-sqlite/kv-store';
import { PendingPrediction, PI5Result, Piece } from './types';

const KEYS = {
  pieces: 'phyllos.mobile.pieces',
  onboarding: 'phyllos.mobile.onboarding',
  impacts: 'phyllos.mobile.impacts',
  pending: 'phyllos.mobile.pending',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await Storage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await Storage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getPieces: () => readJson<Piece[]>(KEYS.pieces, []),
  setPieces: (items: Piece[]) => writeJson(KEYS.pieces, items),
  getOnboarding: async () => (await Storage.getItem(KEYS.onboarding)) === 'done',
  setOnboarding: () => Storage.setItem(KEYS.onboarding, 'done'),
  resetOnboarding: () => Storage.removeItem(KEYS.onboarding),
  getImpacts: () => readJson<Record<string, PI5Result[]>>(KEYS.impacts, {}),
  setImpacts: (items: Record<string, PI5Result[]>) => writeJson(KEYS.impacts, items),
  getPending: () => readJson<PendingPrediction[]>(KEYS.pending, []),
  setPending: (items: PendingPrediction[]) => writeJson(KEYS.pending, items),
};
