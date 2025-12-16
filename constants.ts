import { FishType } from './types';

export const CANVAS_WIDTH = 1180;
export const CANVAS_HEIGHT = 820;
export const WATER_LEVEL = 220;

export const BOAT_WIDTH = 380;
export const BOAT_HEIGHT = 100;

export const HOOK_SPEED = 8;
export const REEL_SPEED = 10;

export const FISH_TYPES: FishType[] = [
  // Fish (Score +1) - Removed Clownfish, Shrimp, Puffer as requested.
  { id: 'squid', name: '烏賊', emoji: '🦑', score: 1, speed: 3, depth: 'medium', rarity: 0.4, color: '#ec4899', category: 'fish' },
  { id: 'octopus', name: '章魚', emoji: '🐙', score: 1, speed: 1.2, depth: 'deep', rarity: 0.2, color: '#a855f7', category: 'fish' },
  { id: 'crab', name: '螃蟹', emoji: '🦀', score: 1, speed: 1, depth: 'deep', rarity: 0.6, color: '#ef4444', category: 'fish' },
  
  // Trash (Score -1) - Increased variety (Straw, Can, Bag, Boot, Tire)
  { id: 'bag', name: '塑膠袋', emoji: '🛍️', score: -1, speed: 0.5, depth: 'shallow', rarity: 0.5, color: '#e5e7eb', category: 'trash' },
  { id: 'can', name: '飲料罐', emoji: '🥫', score: -1, speed: 0.8, depth: 'medium', rarity: 0.5, color: '#ef4444', category: 'trash' },
  { id: 'straw', name: '吸管', emoji: '🥤', score: -1, speed: 0.6, depth: 'medium', rarity: 0.5, color: '#cbd5e1', category: 'trash' },
  { id: 'boot', name: '舊靴子', emoji: '👢', score: -1, speed: 1, depth: 'deep', rarity: 0.6, color: '#4b5563', category: 'trash' },
  { id: 'tire', name: '廢輪胎', emoji: '🛞', score: -1, speed: 0.4, depth: 'deep', rarity: 0.4, color: '#1f2937', category: 'trash' },
];