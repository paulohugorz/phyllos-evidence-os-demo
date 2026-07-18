import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/src/lib/storage';
import { fetchPI5Summary, pieceToPI5Input, predictPI5, predictPI5Online } from '@/src/lib/pi5';
import { PendingPrediction, PI5Result, Piece } from '@/src/lib/types';

type NewPiece = Omit<Piece, 'id' | 'createdAt' | 'updatedAt' | 'images'> & { images?: string[] };

type AppContextValue = {
  loading: boolean;
  onboardingDone: boolean;
  pieces: Piece[];
  impacts: Record<string, PI5Result[]>;
  pending: PendingPrediction[];
  pipelineSummary: any;
  completeOnboarding: () => Promise<void>;
  restartOnboarding: () => Promise<void>;
  addPiece: (input: NewPiece) => Promise<Piece>;
  updatePiece: (id: string, patch: Partial<Piece>) => Promise<void>;
  removePiece: (id: string) => Promise<void>;
  calculateImpact: (piece: Piece) => Promise<PI5Result>;
  syncPending: () => Promise<number>;
  refreshSummary: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [impacts, setImpacts] = useState<Record<string, PI5Result[]>>({});
  const [pending, setPending] = useState<PendingPrediction[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [done, savedPieces, savedImpacts, savedPending] = await Promise.all([
        storage.getOnboarding(), storage.getPieces(), storage.getImpacts(), storage.getPending(),
      ]);
      setOnboardingDone(done);
      setPieces(savedPieces);
      setImpacts(savedImpacts);
      setPending(savedPending);
      setLoading(false);
      fetchPI5Summary().then(setPipelineSummary).catch(() => undefined);
    })();
  }, []);

  const persistPieces = useCallback(async (next: Piece[]) => { setPieces(next); await storage.setPieces(next); }, []);
  const persistImpacts = useCallback(async (next: Record<string, PI5Result[]>) => { setImpacts(next); await storage.setImpacts(next); }, []);
  const persistPending = useCallback(async (next: PendingPrediction[]) => { setPending(next); await storage.setPending(next); }, []);

  const completeOnboarding = useCallback(async () => { await storage.setOnboarding(); setOnboardingDone(true); }, []);
  const restartOnboarding = useCallback(async () => { await storage.resetOnboarding(); setOnboardingDone(false); }, []);

  const addPiece = useCallback(async (input: NewPiece) => {
    const now = new Date().toISOString();
    const item: Piece = { ...input, id: `piece-${Date.now()}`, images: input.images || [], createdAt: now, updatedAt: now };
    await persistPieces([item, ...pieces]);
    return item;
  }, [persistPieces, pieces]);

  const updatePiece = useCallback(async (id: string, patch: Partial<Piece>) => {
    await persistPieces(pieces.map((piece) => piece.id === id ? { ...piece, ...patch, updatedAt: new Date().toISOString() } : piece));
  }, [persistPieces, pieces]);

  const removePiece = useCallback(async (id: string) => {
    await persistPieces(pieces.filter((piece) => piece.id !== id));
  }, [persistPieces, pieces]);

  const calculateImpact = useCallback(async (piece: Piece) => {
    const input = pieceToPI5Input(piece);
    const result = await predictPI5(input);
    await persistImpacts({ ...impacts, [piece.id]: [result, ...(impacts[piece.id] || [])].slice(0, 20) });
    if (result.pendingSync) {
      const item: PendingPrediction = { id: result.predictionId, pieceId: piece.id, input, createdAt: new Date().toISOString() };
      await persistPending([item, ...pending]);
    }
    return result;
  }, [impacts, pending, persistImpacts, persistPending]);

  const syncPending = useCallback(async () => {
    let synced = 0;
    const remaining: PendingPrediction[] = [];
    const nextImpacts = { ...impacts };
    for (const item of pending) {
      try {
        const result = await predictPI5Online(item.input);
        nextImpacts[item.pieceId] = [result, ...(nextImpacts[item.pieceId] || [])].filter((entry) => entry.predictionId !== item.id).slice(0, 20);
        synced += 1;
      } catch { remaining.push(item); }
    }
    await persistImpacts(nextImpacts);
    await persistPending(remaining);
    return synced;
  }, [impacts, pending, persistImpacts, persistPending]);

  const refreshSummary = useCallback(async () => {
    try { setPipelineSummary(await fetchPI5Summary()); } catch { setPipelineSummary(null); }
  }, []);

  const value = useMemo(() => ({ loading, onboardingDone, pieces, impacts, pending, pipelineSummary, completeOnboarding, restartOnboarding, addPiece, updatePiece, removePiece, calculateImpact, syncPending, refreshSummary }), [loading, onboardingDone, pieces, impacts, pending, pipelineSummary, completeOnboarding, restartOnboarding, addPiece, updatePiece, removePiece, calculateImpact, syncPending, refreshSummary]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp deve ser usado dentro de AppProvider');
  return value;
}
