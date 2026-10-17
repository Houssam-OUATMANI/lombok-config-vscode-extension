import test from 'node:test';
import assert from 'node:assert/strict';
import { levenshteinDistance, findClosestMatch } from '../src/utils/levenshtein';

test('computes levenshtein distance accurately', () => {
  assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
  assert.equal(levenshteinDistance('lombok', 'lombok'), 0);
  assert.equal(levenshteinDistance('fluent', 'flunet'), 2);
});

test('finds closest match among candidates', () => {
  const candidates = [
    'lombok.accessors.fluent',
    'lombok.accessors.chain',
    'lombok.equalsAndHashCode.callSuper'
  ];

  const match = findClosestMatch('lombok.accessors.flunet', candidates);
  assert.equal(match, 'lombok.accessors.fluent');

  const match2 = findClosestMatch('lombok.accessors.chin', candidates);
  assert.equal(match2, 'lombok.accessors.chain');
});
