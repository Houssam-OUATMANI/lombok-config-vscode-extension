import './mockVscode';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { LombokConfigCompletionProvider } from '../src/providers/completionProvider';
import { WorkspaceAnnotationService } from '../src/services/workspaceAnnotationService';

function createMockDocument(lines: string[]) {
  const fullText = lines.join('\n');
  return {
    getText: () => fullText,
    lineAt: (lineIndex: number) => ({
      text: lines[lineIndex] ?? '',
      range: new vscode.Range()
    })
  } as unknown as vscode.TextDocument;
}

test('provides key completions on line 2 after newline (empty line)', () => {
  const service = new WorkspaceAnnotationService();
  const provider = new LombokConfigCompletionProvider(service);

  // Line 0: config.stopBubbling = true
  // Line 1: empty line (cursor at line 1, col 0)
  const doc = createMockDocument([
    'config.stopBubbling = true',
    ''
  ]);

  const pos = new vscode.Position(1, 0);
  const result = provider.provideCompletionItems(
    doc,
    pos,
    {} as vscode.CancellationToken,
    {} as vscode.CompletionContext
  ) as vscode.CompletionList;

  assert.ok(result);
  assert.ok(result.items.length > 40);

  // Verify 'clear' directive is suggested
  const clearItem = result.items.find(i => i.label === 'clear');
  assert.ok(clearItem);

  // Verify properties have explicit replacement range
  const chainProp = result.items.find(i => i.label === 'lombok.accessors.chain');
  assert.ok(chainProp);
  assert.ok(chainProp?.range);
});

test('provides key completions on line 2 with partial prefix (e.g. "l" or "lombok.")', () => {
  const service = new WorkspaceAnnotationService();
  const provider = new LombokConfigCompletionProvider(service);

  const doc = createMockDocument([
    'config.stopBubbling = true',
    'lombok.'
  ]);

  const pos = new vscode.Position(1, 7);
  const result = provider.provideCompletionItems(
    doc,
    pos,
    {} as vscode.CancellationToken,
    {} as vscode.CompletionContext
  ) as vscode.CompletionList;

  assert.ok(result);
  assert.ok(result.items.length > 40);

  const fluentProp = result.items.find(i => i.label === 'lombok.accessors.fluent');
  assert.ok(fluentProp);
  assert.ok(fluentProp?.range);
  assert.ok(fluentProp?.filterText?.includes('accessors.fluent'));
});

test('provides value completions on line 2 after operator', () => {
  const service = new WorkspaceAnnotationService();
  const provider = new LombokConfigCompletionProvider(service);

  const doc = createMockDocument([
    'config.stopBubbling = true',
    'lombok.accessors.chain = '
  ]);

  const pos = new vscode.Position(1, 25);
  const result = provider.provideCompletionItems(
    doc,
    pos,
    {} as vscode.CancellationToken,
    {} as vscode.CompletionContext
  ) as vscode.CompletionList;

  assert.ok(result);
  assert.equal(result.items.length, 2); // true, false
  assert.ok(result.items.some(i => i.label === 'true'));
  assert.ok(result.items.some(i => i.label === 'false'));
});
