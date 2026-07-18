export type PieceStage = 'planned' | 'materials' | 'cutting' | 'sewing' | 'fitting' | 'quality' | 'ready' | 'delivered';

export type Piece = {
  id: string;
  name: string;
  category: string;
  client?: string;
  material?: string;
  quantity: number;
  dueDate?: string;
  stage: PieceStage;
  wastePct: number;
  carbonKg: number;
  waterL: number;
  chemicalControl: number;
  materialCircularity: number;
  durabilityUses: number;
  coverage: number;
  confidence: number;
  images: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PI5Result = {
  predictionId: string;
  methodology: string;
  methodologyVersion: string;
  modelVersion: string;
  modelType: string;
  category: string;
  score: number;
  dimensions: {
    climate: number;
    water: number;
    chemicals: number;
    materials: number;
    wasteCircularity: number;
    durability: number;
  };
  coverage: number;
  confidence: number;
  publicationStatus: string;
  critical: boolean;
  calculatedAt: string;
  source?: 'server' | 'offline';
  pendingSync?: boolean;
};

export type PendingPrediction = {
  id: string;
  pieceId: string;
  input: Record<string, unknown>;
  createdAt: string;
};
