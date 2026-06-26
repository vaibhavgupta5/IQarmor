import { PolicyRule } from '@armoriq/shared';
import { CheckResult } from '../types';

function matchesPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return toolName.startsWith(prefix);
  }
  return toolName === pattern;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: any, part) => acc && acc[part], obj);
}

export function checkValidationRules(toolName: string, params: Record<string, unknown>, rules: PolicyRule[]): CheckResult {
  const validateRules = rules.filter(r => r.type === 'VALIDATE' && r.isActive && matchesPattern(toolName, r.toolPattern));

  for (const rule of validateRules) {
    if (!rule.condition) continue;
    const { field, operator, value } = rule.condition;
    const paramValue = getNestedValue(params, field);

    if (paramValue === undefined) {
      // If the field is missing but validated, we assume failure since we can't validate it safely.
      return { matched: true, verdict: 'VALIDATION_FAIL', reason: `Field '${field}' is missing but required by validation rule`, matchedRuleId: rule.id };
    }

    const strParam = String(paramValue);
    let passed = false;

    switch (operator) {
      case 'starts_with': passed = strParam.startsWith(String(value)); break;
      case 'ends_with': passed = strParam.endsWith(String(value)); break;
      case 'contains': passed = strParam.includes(String(value)); break;
      case 'not_contains': passed = !strParam.includes(String(value)); break;
      case 'matches_regex': passed = new RegExp(String(value)).test(strParam); break;
      case 'lt': passed = Number(paramValue) < Number(value); break;
      case 'gt': passed = Number(paramValue) > Number(value); break;
      case 'in_list': passed = Array.isArray(value) && value.includes(strParam); break;
      case 'not_in_list': passed = Array.isArray(value) && !value.includes(strParam); break;
    }

    if (!passed) {
      return {
        matched: true,
        verdict: 'VALIDATION_FAIL',
        reason: `Field '${field}' failed validation operator '${operator}'`,
        matchedRuleId: rule.id
      };
    }
  }

  return { matched: false };
}
