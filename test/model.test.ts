import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALL_LOMBOK_PROPERTIES,
  createLombokPropertiesJsonSchema,
  findProperty
} from '../src/model/lombokProperties';

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

test('generated JSON schema stays in sync with the property model', () => {
  const generatedSchema = JSON.parse(
    readFileSync(join(process.cwd(), 'schemas', 'lombok-config.schema.json'), 'utf8')
  );
  const expectedSchema = createLombokPropertiesJsonSchema();

  assert.deepEqual(generatedSchema, expectedSchema);
  assert.deepEqual(
    Object.keys(generatedSchema.properties).sort(),
    ALL_LOMBOK_PROPERTIES.map(property => property.key).sort()
  );

  assert.deepEqual(generatedSchema.properties['config.stopBubbling'].enum, [true, false]);
  assert.equal(generatedSchema.properties['config.stopBubbling'].default, false);
  assert.deepEqual(generatedSchema.properties['lombok.accessors.prefix'].items, { type: 'string' });
  assert.deepEqual(
    generatedSchema.properties['lombok.equalsAndHashCode.callSuper'].enum,
    ['call', 'ignore', 'warn']
  );
  assert.equal(generatedSchema.properties['lombok.accessors.noIsPrefix'].deprecated, true);
});
