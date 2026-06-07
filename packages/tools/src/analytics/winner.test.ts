import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winnerScore, evaluateWinner, type ProductWindowMetrics } from './winner.js';

const base: ProductWindowMetrics = {
  sales7d: 0,
  sales14d: 0,
  grossProfit7d: 0,
  conversionRate: 0,
  favoritesOrClicks: 0,
  trendMomentum: 0,
};

test('winnerScore applies the canonical weights', () => {
  assert.equal(winnerScore({ ...base, sales7d: 1 }), 40);
  assert.equal(winnerScore({ ...base, grossProfit7d: 2 }), 50);
  assert.equal(winnerScore({ ...base, trendMomentum: 10 }), 50);
});

test('3 sales in 7 days triggers a winner', () => {
  const v = evaluateWinner({ ...base, sales7d: 3 });
  assert.equal(v.isWinner, true);
  assert.equal(v.triggeredRule, '3_sales_7d');
});

test('conversion rate boundary is strictly greater than 2.5%', () => {
  assert.equal(evaluateWinner({ ...base, conversionRate: 0.025 }).isWinner, false);
  assert.equal(evaluateWinner({ ...base, conversionRate: 0.026 }).triggeredRule, 'conversion_2_5pct');
});

test('no signals means no winner', () => {
  assert.equal(evaluateWinner(base).isWinner, false);
});
