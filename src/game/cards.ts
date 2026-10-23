export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'] as const;
export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];
export interface Card { id: string; rank: Rank; suit: Suit }
export const SYMBOL: Record<Suit, string> = { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' };
export const COURTS: Record<Suit, Record<string, string>> = {
  spades: {J:'Ogun', Q:'Oya', K:'Shango'}, hearts: {J:'Oshun', Q:'Yemoja', K:'Obatala'},
  diamonds: {J:'Eshu', Q:'Orunmila', K:'Oduduwa'}, clubs: {J:'Erinle', Q:'Osanyin', K:'Aganju'},
};
export const matches = (a: Card, b: Card) => a.rank === b.rank || a.suit === b.suit;
export const cardName = (c: Card) => `${c.rank} of ${c.suit}`;
export const makeDeck = (): Card[] => SUITS.flatMap(suit => RANKS.map(rank => ({ id: `${rank}-${suit}`, rank, suit })));
