/**
 * Winner detection + scoring. Pure functions so the formula lives in exactly
 * one tested place and can be tuned without hunting through the codebase.
 */

export interface ProductWindowMetrics {
  sales7d: number;
  sales14d: number;
  grossProfit7d: number; // revenue minus Printify fulfillment cost
  conversionRate: number; // 0-1
  favoritesOrClicks: number;
  trendMomentum: number; // 0-100
}

/**
 * Winner Score =
 *   sales_7d * 40 + gross_profit_7d * 25 + conversion_rate * 20
 *   + favorites/clicks * 10 + trend_momentum * 5
 */
export function winnerScore(m: ProductWindowMetrics): number {
  return (
    m.sales7d * 40 +
    m.grossProfit7d * 25 +
    m.conversionRate * 20 +
    m.favoritesOrClicks * 10 +
    m.trendMomentum * 5
  );
}

export interface WinnerVerdict {
  isWinner: boolean;
  triggeredRule: string | null;
  score: number;
}

/**
 * A product is a winner when ANY rule fires:
 *   - 3 sales in 7 days
 *   - 5 sales in 14 days
 *   - $75+ gross profit (7d)
 *   - conversion rate > 2.5%
 */
export function evaluateWinner(m: ProductWindowMetrics): WinnerVerdict {
  const score = winnerScore(m);
  let triggeredRule: string | null = null;

  if (m.sales7d >= 3) triggeredRule = '3_sales_7d';
  else if (m.sales14d >= 5) triggeredRule = '5_sales_14d';
  else if (m.grossProfit7d >= 75) triggeredRule = 'gross_profit_75';
  else if (m.conversionRate > 0.025) triggeredRule = 'conversion_2_5pct';

  return { isWinner: triggeredRule !== null, triggeredRule, score };
}
