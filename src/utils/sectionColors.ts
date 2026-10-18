import type { SectionDto } from '../types/api';

// Price-zone colors. The color of a zone comes from its REAL price rank in this event:
// the most expensive zone is champagne gold, then blues and purples.
// All colors keep a readable contrast against the ivory map background.
const PALETTE = [
  '#B8893B', // gold – most expensive
  '#1F5FD1', // royal blue
  '#3E9BE0', // sky blue
  '#6E56CF', // violet
  '#9A86F0', // lavender
  '#2B8A84', // teal
  '#713B49', // burgundy
  '#5B7C99', // slate
];

export interface SectionStyle {
  color: string;
  rank: number; // 0 = most expensive
}

export function buildSectionStyles(sections: SectionDto[]): Map<number, SectionStyle> {
  // Same price -> same rank, so equal prices always share a color
  const prices = [...new Set(sections.map((s) => s.price))].sort((a, b) => b - a);
  const map = new Map<number, SectionStyle>();
  for (const s of sections) {
    const rank = prices.indexOf(s.price);
    map.set(s.id, { rank, color: PALETTE[rank % PALETTE.length] });
  }
  return map;
}
