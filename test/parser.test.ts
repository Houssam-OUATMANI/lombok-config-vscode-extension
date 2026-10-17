import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfigText, getCursorContext } from '../src/parser/configParser';

test('parses empty and comment lines', () => {
  const content = '\n# Root config\n   \n# Another comment\n';
  const parsed = parseConfigText(content);
  assert.equal(parsed.nodes.length, 5);
  assert.equal(parsed.nodes[0].kind, 'empty');
  assert.equal(parsed.nodes[1].kind, 'comment');
  assert.equal(parsed.nodes[2].kind, 'empty');
  assert.equal(parsed.nodes[3].kind, 'comment');
});

test('parses standard property assignments', () => {
  const content = [
    'config.stopBubbling = true',
    'lombok.accessors.chain = true # enable chaining',
    'lombok.accessors.prefix += m_',
    'lombok.accessors.prefix -= f_'
  ].join('\n');

  const parsed = parseConfigText(content);
  assert.equal(parsed.nodes.length, 4);

  const n0 = parsed.nodes[0];
  assert.equal(n0.kind, 'property');
  if (n0.kind === 'property') {
    assert.equal(n0.key, 'config.stopBubbling');
    assert.equal(n0.operator, '=');
    assert.equal(n0.value, 'true');
  }

  const n1 = parsed.nodes[1];
  assert.equal(n1.kind, 'property');
  if (n1.kind === 'property') {
    assert.equal(n1.key, 'lombok.accessors.chain');
    assert.equal(n1.operator, '=');
    assert.equal(n1.value, 'true');
    assert.equal(n1.comment?.trim(), 'enable chaining');
  }

  const n2 = parsed.nodes[2];
  assert.equal(n2.kind, 'property');
  if (n2.kind === 'property') {
    assert.equal(n2.operator, '+=');
    assert.equal(n2.value, 'm_');
  }

  const n3 = parsed.nodes[3];
  assert.equal(n3.kind, 'property');
  if (n3.kind === 'property') {
    assert.equal(n3.operator, '-=');
    assert.equal(n3.value, 'f_');
  }
});

test('parses clear directive', () => {
  const content = 'clear lombok.accessors.prefix # clear prefixes';
  const parsed = parseConfigText(content);
  assert.equal(parsed.nodes.length, 1);
  const n = parsed.nodes[0];
  assert.equal(n.kind, 'clear');
  if (n.kind === 'clear') {
    assert.equal(n.key, 'lombok.accessors.prefix');
    assert.equal(n.comment?.trim(), 'clear prefixes');
  }
});

test('parses malformed lines gracefully', () => {
  const content = 'lombok.accessors.chain\n= true';
  const parsed = parseConfigText(content);
  assert.equal(parsed.nodes[0].kind, 'malformed');
});

test('detects cursor context correctly', () => {
  const content = [
    'lombok.accessors.',
    'lombok.equalsAndHashCode.callSuper = ',
    'clear lombok.copyable'
  ].join('\n');

  const parsed = parseConfigText(content);

  // Line 0, inside key
  const ctx0 = getCursorContext(parsed, 0, 17);
  assert.equal(ctx0.kind, 'key');

  // Line 1, after '=' in value position
  const ctx1 = getCursorContext(parsed, 1, 37);
  assert.equal(ctx1.kind, 'value');

  // Line 2, after 'clear '
  const ctx2 = getCursorContext(parsed, 2, 10);
  assert.equal(ctx2.kind, 'clearTarget');
});
