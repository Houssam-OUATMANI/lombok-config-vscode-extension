import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_LOMBOK_PROPERTIES, findProperty } from '../src/model/lombokProperties';

test('contains standard Lombok keys and flag usages', () => {
  assert.ok(ALL_LOMBOK_PROPERTIES.length > 40);

  const stopBubbling = findProperty('config.stopBubbling');
  assert.ok(stopBubbling);
  assert.equal(stopBubbling?.type, 'boolean');

  const chain = findProperty('lombok.accessors.chain');
  assert.ok(chain);
  assert.equal(chain?.type, 'boolean');

  const prefix = findProperty('lombok.accessors.prefix');
  assert.ok(prefix);
  assert.equal(prefix?.type, 'list');

  const callSuper = findProperty('lombok.equalsAndHashCode.callSuper');
  assert.ok(callSuper);
  assert.equal(callSuper?.type, 'enum');
  assert.deepEqual(callSuper?.allowedValues, ['call', 'ignore', 'warn']);

  const deprecatedProp = findProperty('lombok.anyConstructor.suppressConstructorProperties');
  assert.ok(deprecatedProp);
  assert.equal(deprecatedProp?.deprecated, true);
});

test('property lookup is case-insensitive and trims whitespace', () => {
  assert.ok(findProperty('  LOMBOK.ACCESSORS.CHAIN  '));
  assert.ok(findProperty('Config.StopBubbling'));
});
