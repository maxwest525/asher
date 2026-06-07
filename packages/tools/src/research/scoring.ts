/**
 * Niche opportunity scoring. Pure functions — no I/O — so they are easy to test
 * and tune in one place.
 */

export interface NicheSignals {
  buyerIntent: number; // 0-100
  trendScore: number; // 0-100
  competitionScore: number; // 0-100 (higher = more competition = worse)
  seasonalityBoost?: number; // -10..10 optional adjustment
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

/**
 * Opportunity score weights demand and trend up, competition down.
 *   opportunity = 0.45*intent + 0.35*trend + 0.20*(100 - competition) + seasonality
 * Result is clamped to 0-100.
 */
export function opportunityScore(signals: NicheSignals): number {
  const { buyerIntent, trendScore, competitionScore, seasonalityBoost = 0 } = signals;
  const raw =
    0.45 * clamp(buyerIntent) +
    0.35 * clamp(trendScore) +
    0.2 * (100 - clamp(competitionScore)) +
    seasonalityBoost;
  return Math.round(clamp(raw));
}

/** Slogan quality gate — rejects weak slogans before they reach design. */
export interface SloganVerdict {
  ok: boolean;
  reasons: string[];
}

const TRADEMARK_HINTS = [
  // Non-exhaustive risk hints; humans make the final call.
  'nike',
  'disney',
  'marvel',
  'nfl',
  'nba',
  'taylor swift',
];

export function evaluateSlogan(slogan: string): SloganVerdict {
  const reasons: string[] = [];
  const text = slogan.trim();
  const lower = text.toLowerCase();

  if (text.length < 3) reasons.push('too short');
  if (text.length > 60) reasons.push('too long');
  if (text.split(/\s+/).length > 10) reasons.push('too wordy');
  if (TRADEMARK_HINTS.some((h) => lower.includes(h))) reasons.push('possible trademark');

  return { ok: reasons.length === 0, reasons };
}
