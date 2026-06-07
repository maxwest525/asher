import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opportunityScore, evaluateSlogan } from './scoring.js';

test('opportunityScore rewards demand and penalizes competition', () => {
  const highDemandLowComp = opportunityScore({
    buyerIntent: 90,
    trendScore: 80,
    competitionScore: 10,
  });
  const lowDemandHighComp = opportunityScore({
    buyerIntent: 30,
    trendScore: 20,
    competitionScore: 90,
  });
  assert.ok(highDemandLowComp > lowDemandHighComp);
  assert.ok(highDemandLowComp >= 0 && highDemandLowComp <= 100);
});

test('evaluateSlogan rejects weak slogans', () => {
  assert.equal(evaluateSlogan('Coffee Scrubs Chaos').ok, true);
  assert.equal(evaluateSlogan('a').ok, false);
  assert.deepEqual(evaluateSlogan('I love the Nike lifestyle so much').reasons.includes('possible trademark'), true);
});
