export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER
}

export enum HookState {
  IDLE,
  CASTING,
  REELING
}

export interface FishType {
  id: string;
  name: string;
  emoji: string;
  score: number;
  speed: number;
  depth: 'shallow' | 'medium' | 'deep';
  rarity: number; // 0-1, lower is rarer
  color: string;
  category: 'fish' | 'trash';
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  type: FishType;
  direction: 1 | -1; // 1 for right, -1 for left
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export interface CaughtFish {
  type: FishType;
  timestamp: number;
}