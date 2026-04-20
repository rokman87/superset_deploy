/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { JsonObject } from '@superset-ui/core';

type MetricColorContext = JsonObject & {
  value?: unknown;
};

const CASE_REGEX = /^case\s+([\s\S]+?)\s+end$/i;
const WHEN_THEN_REGEX =
  /when\s+([\s\S]+?)\s+then\s+([\s\S]+?)(?=\s+when\s+|\s+else\s+|$)/gi;
const ELSE_REGEX = /\selse\s+([\s\S]+)$/i;
const LOGICAL_OPERATOR_REGEX = /\s+(AND|OR)\s+/i;
const IS_NULL_REGEX = /^(.+?)\s+is\s+(not\s+)?null$/i;
const COMPARISON_REGEX = /^(.+?)\s*(>=|<=|<>|!=|=|>|<)\s*(.+)$/i;

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeLiteral(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
}

function toComparableValue(value: unknown) {
  const normalized = normalizeLiteral(value);
  if (typeof normalized === 'string' && normalized !== '') {
    const maybeNumber = Number(normalized);
    if (!Number.isNaN(maybeNumber)) {
      return maybeNumber;
    }
  }
  return normalized;
}

function getContextValue(token: string, context: MetricColorContext) {
  const normalizedToken = stripWrappingQuotes(token);
  if (normalizedToken in context) {
    return context[normalizedToken];
  }
  return undefined;
}

function resolveOperand(token: string, context: MetricColorContext) {
  const trimmed = token.trim();
  const maybeContextValue = getContextValue(trimmed, context);
  if (maybeContextValue !== undefined) {
    return maybeContextValue;
  }
  const unwrapped = stripWrappingQuotes(trimmed);
  if (/^(true|false)$/i.test(unwrapped)) {
    return unwrapped.toLowerCase() === 'true';
  }
  if (/^null$/i.test(unwrapped)) {
    return null;
  }
  const maybeNumber = Number(unwrapped);
  if (!Number.isNaN(maybeNumber) && unwrapped !== '') {
    return maybeNumber;
  }
  return unwrapped;
}

function compareValues(left: unknown, operator: string, right: unknown) {
  const comparableLeft = toComparableValue(left);
  const comparableRight = toComparableValue(right);

  switch (operator) {
    case '=':
      return comparableLeft === comparableRight;
    case '!=':
    case '<>':
      return comparableLeft !== comparableRight;
    case '>':
      return Number(comparableLeft) > Number(comparableRight);
    case '>=':
      return Number(comparableLeft) >= Number(comparableRight);
    case '<':
      return Number(comparableLeft) < Number(comparableRight);
    case '<=':
      return Number(comparableLeft) <= Number(comparableRight);
    default:
      return false;
  }
}

function evaluatePredicate(predicate: string, context: MetricColorContext) {
  const trimmed = predicate.trim();
  if (!trimmed) {
    return false;
  }

  const isNullMatch = trimmed.match(IS_NULL_REGEX);
  if (isNullMatch) {
    const [, leftToken, notKeyword] = isNullMatch;
    const leftValue = resolveOperand(leftToken, context);
    return notKeyword ? leftValue != null : leftValue == null;
  }

  const comparisonMatch = trimmed.match(COMPARISON_REGEX);
  if (!comparisonMatch) {
    return false;
  }

  const [, leftToken, operator, rightToken] = comparisonMatch;
  return compareValues(
    resolveOperand(leftToken, context),
    operator,
    resolveOperand(rightToken, context),
  );
}

function evaluateCondition(condition: string, context: MetricColorContext) {
  const parts = condition
    .trim()
    .split(LOGICAL_OPERATOR_REGEX)
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  let result = evaluatePredicate(parts[0], context);
  for (let i = 1; i < parts.length; i += 2) {
    const operator = parts[i]?.toUpperCase();
    const nextPredicate = parts[i + 1];
    const nextResult = evaluatePredicate(nextPredicate, context);
    result = operator === 'OR' ? result || nextResult : result && nextResult;
  }

  return result;
}

function resolveColorToken(colorToken: string) {
  const trimmed = stripWrappingQuotes(colorToken);
  return trimmed || undefined;
}

export function getMetricColorFromSql(
  sql: string | undefined,
  context: MetricColorContext,
) {
  if (!sql?.trim()) {
    return undefined;
  }

  const normalizedSql = sql.replace(/\s+/g, ' ').trim();
  const caseMatch = normalizedSql.match(CASE_REGEX);
  if (!caseMatch) {
    return resolveColorToken(normalizedSql);
  }

  const caseBody = caseMatch[1];
  const whenThens = Array.from(caseBody.matchAll(WHEN_THEN_REGEX));
  for (const [, condition, colorToken] of whenThens) {
    if (evaluateCondition(condition, context)) {
      return resolveColorToken(colorToken);
    }
  }

  const elseMatch = caseBody.match(ELSE_REGEX);
  if (elseMatch) {
    return resolveColorToken(elseMatch[1]);
  }

  return undefined;
}

export default getMetricColorFromSql;
