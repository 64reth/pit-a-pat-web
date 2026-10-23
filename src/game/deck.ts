import type { Card } from './cards';
// State is carried in the game so replaying an action never depends on a global RNG.
export function randomStep(seed: number): [number, number] {
  let next = seed >>> 0 || 1;
  next ^= next << 13; next ^= next >>> 17; next ^= next << 5;
  return [(next >>> 0) / 4294967296, next >>> 0];
}
export function shuffle(cards: Card[], seed: number): { cards: Card[]; seed: number } {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    let n: number; [n, seed] = randomStep(seed);
    const j = Math.floor(n * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { cards: result, seed };
}
