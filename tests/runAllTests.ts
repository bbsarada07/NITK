import * as assert from 'assert';
import { loadRules, checkRuleGate, GateBlockedError, RuleValidationError, validateRuleRecord } from '../src/rules/loader';
import { evaluateTier } from '../src/evaluator/tierEvaluator';
import { RuleRecord } from '../src/types/rules';
import { runExtendedTests } from './extendedTests';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err: unknown) {
    failedTests++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log('====================================================');
console.log('   HerChart Clinical Rules & Tier Evaluator Tests   ');
console.log('====================================================\n');

// 1. Load and Validate rules.json in DEV mode
console.log('--- 1. Rules Loader & Schema Validation ---');
const rulesFile = loadRules({ mode: 'dev' });

runTest('rules.json loads and matches schemaVersion 1.0.0', () => {
  assert.strictEqual(rulesFile.schemaVersion, '1.0.0');
  assert.strictEqual(rulesFile.rules.length, 3);
});

const ferritinRule = rulesFile.rules.find(r => r.marker === 'ferritin');
const hbRule = rulesFile.rules.find(r => r.marker === 'hemoglobin');
const tshRule = rulesFile.rules.find(r => r.marker === 'tsh');

runTest('Found rules for ferritin, hemoglobin, and tsh', () => {
  assert.ok(ferritinRule, 'ferritin rule must exist');
  assert.ok(hbRule, 'hemoglobin rule must exist');
  assert.ok(tshRule, 'tsh rule must exist');
});

runTest('Rule validation rejects invalid records', () => {
  assert.throws(() => {
    validateRuleRecord({ marker: '' });
  }, RuleValidationError);
});

// 2. Ferritin Tests (10 / 20 / 40)
console.log('\n--- 2. Ferritin Tests (10, 20, 40 ug/L) ---');

runTest('Ferritin 10 ug/L -> matches Tier A (< 15 ug/L)', () => {
  assert.ok(ferritinRule);
  const result = evaluateTier({ marker: 'ferritin', value: 10, unit: 'ug/L' }, ferritinRule);
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.matchedTier?.id, 'A');
  assert.strictEqual(result.flagType, 'valueOnly');
  assert.ok(result.flagMessage.includes('Below WHO deficiency cutoff (<15 ug/L)'));
  assert.strictEqual(result.normalizedValue, 10);
});

runTest('Ferritin 20 ug/L -> matches Tier B (15 to < 30 ug/L)', () => {
  assert.ok(ferritinRule);
  const result = evaluateTier({ marker: 'ferritin', value: 20, unit: 'ug/L' }, ferritinRule);
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.matchedTier?.id, 'B');
  assert.strictEqual(result.flagType, 'valueOnly');
  assert.ok(result.flagMessage.includes('Borderline (15 to <30 ug/L)'));
});

runTest('Ferritin 40 ug/L -> unflagged (normal / above cutoffs)', () => {
  assert.ok(ferritinRule);
  const result = evaluateTier({ marker: 'ferritin', value: 40, unit: 'ug/L' }, ferritinRule);
  assert.strictEqual(result.isFlagged, false);
  assert.strictEqual(result.matchedTier, null);
  assert.strictEqual(result.flagType, 'none');
  assert.ok(result.flagMessage.includes('within standard guideline limits'));
});

// 3. Hemoglobin Tests (11.3 / 12 / 13 g/dL)
console.log('\n--- 3. Hemoglobin Tests (11.3, 12, 13 g/dL) ---');

runTest('Hb 11.3 g/dL -> matches Tier A (< 12 g/dL)', () => {
  assert.ok(hbRule);
  const result = evaluateTier({ marker: 'hemoglobin', value: 11.3, unit: 'g/dL' }, hbRule);
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.matchedTier?.id, 'A');
  assert.strictEqual(result.flagType, 'valueOnly');
  assert.ok(result.flagMessage.includes('Below WHO anemia cutoff'));
});

runTest('Hb 12 g/dL -> unflagged (cutoff is < 12 g/dL, not inclusive)', () => {
  assert.ok(hbRule);
  const result = evaluateTier({ marker: 'hemoglobin', value: 12, unit: 'g/dL' }, hbRule);
  assert.strictEqual(result.isFlagged, false);
  assert.strictEqual(result.matchedTier, null);
  assert.strictEqual(result.flagType, 'none');
});

runTest('Hb 13 g/dL -> unflagged (normal / within limits)', () => {
  assert.ok(hbRule);
  const result = evaluateTier({ marker: 'hemoglobin', value: 13, unit: 'g/dL' }, hbRule);
  assert.strictEqual(result.isFlagged, false);
  assert.strictEqual(result.matchedTier, null);
  assert.strictEqual(result.flagType, 'none');
});

// 4. TSH Tests (3.0 / 4.5 / 1.5 mIU/L)
console.log('\n--- 4. TSH Tests (3.0, 4.5, 1.5 mIU/L) ---');

runTest('TSH 3.0 mIU/L -> matches Tier B (2.5 to < 4.0 mIU/L)', () => {
  assert.ok(tshRule);
  const result = evaluateTier({ marker: 'tsh', value: 3.0, unit: 'mIU/L' }, tshRule);
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.matchedTier?.id, 'B');
  assert.strictEqual(result.flagType, 'valueOnly');
  assert.ok(result.flagMessage.includes('at or above the debated 2.5 mIU/L upper limit'));
});

runTest('TSH 4.5 mIU/L -> matches Tier A (outside standard reference range >= 4.0 mIU/L)', () => {
  assert.ok(tshRule);
  const result = evaluateTier({ marker: 'tsh', value: 4.5, unit: 'mIU/L' }, tshRule);
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.matchedTier?.id, 'A');
  assert.strictEqual(result.flagType, 'valueOnly');
  assert.ok(result.flagMessage.includes('Outside the standard reference range'));
});

runTest('TSH 1.5 mIU/L -> unflagged (normal / within standard range)', () => {
  assert.ok(tshRule);
  const result = evaluateTier({ marker: 'tsh', value: 1.5, unit: 'mIU/L' }, tshRule);
  assert.strictEqual(result.isFlagged, false);
  assert.strictEqual(result.matchedTier, null);
  assert.strictEqual(result.flagType, 'none');
});

// 5. Symptom Pattern Triggering Tests
console.log('\n--- 5. Symptom Trigger & Flag Decisions ---');

runTest('Ferritin 10 with 1 symptom (fatigue) -> minSymptoms (2) NOT met -> valueOnly flag', () => {
  assert.ok(ferritinRule);
  const result = evaluateTier(
    { marker: 'ferritin', value: 10, unit: 'ug/L', symptoms: ['fatigue'] },
    ferritinRule
  );
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.flagType, 'valueOnly');
  assert.strictEqual(result.symptomThresholdMet, false);
  assert.strictEqual(result.matchedSymptoms.length, 1);
  assert.ok(result.flagMessage.includes('This is a single value'));
});

runTest('Ferritin 10 with 2 symptoms (fatigue + hair_loss) -> minSymptoms (2) MET -> pattern flag', () => {
  assert.ok(ferritinRule);
  const result = evaluateTier(
    { marker: 'ferritin', value: 10, unit: 'ug/L', symptoms: ['fatigue', 'hair_loss'] },
    ferritinRule
  );
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.flagType, 'pattern');
  assert.strictEqual(result.symptomThresholdMet, true);
  assert.strictEqual(result.matchedSymptoms.length, 2);
  assert.ok(result.flagMessage.includes('You also logged symptoms linked to low iron'));
  assert.ok(result.flagMessage.includes('Fatigue, Hair loss'));
  assert.ok(result.doctorQuestions.length > 0);
  assert.ok(result.caveats.length > 0);
});

// 6. Unit Conversion Tests
console.log('\n--- 6. Unit Conversions ---');

runTest('Ferritin 10 ng/mL converts to 10 ug/L -> matches Tier A', () => {
  assert.ok(ferritinRule);
  const result = evaluateTier({ marker: 'ferritin', value: 10, unit: 'ng/mL' }, ferritinRule);
  assert.strictEqual(result.normalizedValue, 10);
  assert.strictEqual(result.canonicalUnit, 'ug/L');
  assert.strictEqual(result.matchedTier?.id, 'A');
});

runTest('Hemoglobin 113 g/L converts (multiplier 0.1) to 11.3 g/dL -> matches Tier A', () => {
  assert.ok(hbRule);
  const result = evaluateTier({ marker: 'hemoglobin', value: 113, unit: 'g/L' }, hbRule);
  assert.strictEqual(result.normalizedValue, 11.3);
  assert.strictEqual(result.canonicalUnit, 'g/dL');
  assert.strictEqual(result.matchedTier?.id, 'A');
});

runTest('TSH 3.0 uIU/mL converts (multiplier 1) to 3.0 mIU/L -> matches Tier B', () => {
  assert.ok(tshRule);
  const result = evaluateTier({ marker: 'tsh', value: 3.0, unit: 'uIU/mL' }, tshRule);
  assert.strictEqual(result.normalizedValue, 3.0);
  assert.strictEqual(result.canonicalUnit, 'mIU/L');
  assert.strictEqual(result.matchedTier?.id, 'B');
});

// 7. Gate Check Tests (Block rule with null link/year/lastVerified in prod mode)
console.log('\n--- 7. Gate Enforcement (Prod Mode Blocking) ---');

runTest('In dev mode, gate check detects unverified fields but does not throw', () => {
  assert.ok(ferritinRule);
  const gate = checkRuleGate(ferritinRule);
  assert.strictEqual(gate.isBlocked, true);
  assert.ok(gate.reasons.some(r => r.includes('lastVerified is null')));
  assert.ok(gate.reasons.some(r => r.includes('has null link')));
});

runTest('In prod mode, loading rules.json throws GateBlockedError', () => {
  assert.throws(() => {
    loadRules({ mode: 'prod' });
  }, GateBlockedError);
});

runTest('In prod mode, evaluateTier directly throws GateBlockedError for unverified rule', () => {
  assert.ok(ferritinRule);
  assert.throws(() => {
    evaluateTier({ marker: 'ferritin', value: 10, unit: 'ug/L', mode: 'prod' }, ferritinRule, 'prod');
  }, (err: unknown) => {
    return err instanceof GateBlockedError && err.marker === 'ferritin';
  });
});

runTest('A fully verified rule passes the prod gate without error', () => {
  assert.ok(ferritinRule);
  // Clone rule with valid verification metadata
  const verifiedFerritinRule: RuleRecord = {
    ...ferritinRule,
    lastVerified: '2026-10-24',
    sources: ferritinRule.sources.map((s, idx) => ({
      ...s,
      year: s.year ?? 2024,
      link: s.link ?? `https://evidence.example.org/source-${idx}`
    }))
  };

  const gate = checkRuleGate(verifiedFerritinRule);
  assert.strictEqual(gate.isBlocked, false);
  assert.strictEqual(gate.reasons.length, 0);

  // In prod mode, evaluating the fully verified rule must succeed
  const result = evaluateTier(
    { marker: 'ferritin', value: 10, unit: 'ug/L', mode: 'prod' },
    verifiedFerritinRule,
    'prod'
  );
  assert.strictEqual(result.isFlagged, true);
  assert.strictEqual(result.matchedTier?.id, 'A');
});

// 8+. Boundaries, conversions, gates, rendering, extraction schema and explainer guardrails
async function runTestAsync(name: string, fn: () => Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err: unknown) {
    failedTests++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err instanceof Error ? err.message : String(err)}`);
  }
}
assert.ok(ferritinRule && hbRule && tshRule);
await runExtendedTests({ ferritin: ferritinRule, hemoglobin: hbRule, tsh: tshRule }, runTest, runTestAsync);

// Print summary
console.log('\n====================================================');
console.log(`Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
