import * as fs from 'fs';
import * as path from 'path';
import { EvaluatorMode, RulesFile } from '../types/rules';
import { RuleValidationError, validateRulesFile } from './validate';

export * from './validate';

/**
 * Loads rules.json from disk and validates it against RuleRecord schema
 */
export function loadRules(options?: {
  filePath?: string;
  mode?: EvaluatorMode;
}): RulesFile {
  const mode = options?.mode ?? (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');
  const targetPath = options?.filePath || path.resolve(process.cwd(), 'rules.json');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`rules.json not found at: ${targetPath}`);
  }

  const rawText = fs.readFileSync(targetPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new RuleValidationError(`Failed to parse rules.json: ${msg}`);
  }

  return validateRulesFile(parsed, mode);
}
