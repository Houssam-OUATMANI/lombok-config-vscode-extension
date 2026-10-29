import './mockVscode';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { LombokConfigDocumentSymbolProvider } from '../src/providers/symbolProvider';
import { LombokConfigDiagnosticProvider, DIAGNOSTIC_CODES } from '../src/providers/diagnosticProvider';
import { LombokConfigCodeActionProvider } from '../src/providers/codeActionProvider';

function createMockDoc(content: string, fileName = 'd:/project/lombok.config') {
  const lines = content.split('\n');
  return {
    languageId: 'lombok-config',
    fileName,
    uri: { fsPath: fileName, toString: () => fileName },
    lineCount: lines.length,
    getText: () => content,
    lineAt: (lineIndex: number) => ({
      text: lines[lineIndex] ?? '',
      range: new vscode.Range(lineIndex, 0, lineIndex, (lines[lineIndex] ?? '').length)
    })
  } as unknown as vscode.TextDocument;
}

test('DocumentSymbolProvider groups properties by category', () => {
  const provider = new LombokConfigDocumentSymbolProvider();
  const content = [
    'config.stopBubbling = true',
    'lombok.accessors.fluent = true',
    'lombok.accessors.chain = true',
    'clear lombok.accessors.prefix'
  ].join('\n');

  const doc = createMockDoc(content);
  const symbols = provider.provideDocumentSymbols(doc, {} as vscode.CancellationToken) as vscode.DocumentSymbol[];

  assert.ok(symbols);
  assert.ok(symbols.length >= 2, 'Should have at least Configuration and Accessors categories');

  const configCat = symbols.find(s => s.name === 'Configuration');
  assert.ok(configCat);
  assert.equal(configCat.children.length, 1);
  assert.equal(configCat.children[0].name, 'stopBubbling');

  const accessorsCat = symbols.find(s => s.name === 'Accessors');
  assert.ok(accessorsCat);
  assert.equal(accessorsCat.children.length, 2);
});

test('DiagnosticProvider detects duplicate overridden scalar keys', () => {
  let publishedDiags: vscode.Diagnostic[] = [];
  const mockCollection = {
    set: (_uri: any, diags: vscode.Diagnostic[]) => { publishedDiags = diags; },
    delete: () => { publishedDiags = []; }
  } as unknown as vscode.DiagnosticCollection;

  const provider = new LombokConfigDiagnosticProvider(mockCollection);
  const content = [
    'lombok.accessors.chain = true',
    'lombok.accessors.fluent = true',
    'lombok.accessors.chain = false # overrides line 0'
  ].join('\n');

  const doc = createMockDoc(content);
  provider.updateDiagnostics(doc);

  const dupDiag = publishedDiags.find(d => d.code === DIAGNOSTIC_CODES.DUPLICATE_KEY);
  assert.ok(dupDiag, 'Should flag duplicate key for earlier assignment');
  assert.equal(dupDiag?.range.start.line, 0);
  assert.ok(dupDiag?.message.includes('overridden by line 3'));
});

test('DiagnosticProvider rejects empty property values', () => {
  let publishedDiags: vscode.Diagnostic[] = [];
  const mockCollection = {
    set: (_uri: any, diags: vscode.Diagnostic[]) => { publishedDiags = diags; }
  } as unknown as vscode.DiagnosticCollection;
  const provider = new LombokConfigDiagnosticProvider(mockCollection);

  provider.updateDiagnostics(createMockDoc('lombok.accessors.chain ='));

  const invalidValue = publishedDiags.find(d => d.code === DIAGNOSTIC_CODES.INVALID_VALUE);
  assert.ok(invalidValue, 'Should require a value after the assignment operator');
  assert.ok(invalidValue?.message.includes('A value is required'));
});

test('DiagnosticProvider detects incorrect key casing and provides quick fix', () => {
  let publishedDiags: vscode.Diagnostic[] = [];
  const mockCollection = {
    set: (_uri: any, diags: vscode.Diagnostic[]) => { publishedDiags = diags; }
  } as unknown as vscode.DiagnosticCollection;

  const diagProvider = new LombokConfigDiagnosticProvider(mockCollection);
  const codeActionProvider = new LombokConfigCodeActionProvider();

  const content = 'Lombok.Accessors.Chain = true';
  const doc = createMockDoc(content);
  diagProvider.updateDiagnostics(doc);

  const casingDiag = publishedDiags.find(d => d.code === DIAGNOSTIC_CODES.INVALID_KEY_CASING);
  assert.ok(casingDiag, 'Should flag invalid key casing');
  assert.ok(casingDiag?.message.includes('lombok.accessors.chain'));

  const actions = codeActionProvider.provideCodeActions(
    doc,
    casingDiag.range,
    { diagnostics: [casingDiag] } as vscode.CodeActionContext,
    {} as vscode.CancellationToken
  ) as vscode.CodeAction[];

  assert.ok(actions);
  const fix = actions.find(a => a.title.includes('Change key casing to \'lombok.accessors.chain\''));
  assert.ok(fix, 'Should provide quick fix for casing');
});

test('DiagnosticProvider flags misplaced config.stopBubbling', () => {
  let publishedDiags: vscode.Diagnostic[] = [];
  const mockCollection = {
    set: (_uri: any, diags: vscode.Diagnostic[]) => { publishedDiags = diags; }
  } as unknown as vscode.DiagnosticCollection;

  const provider = new LombokConfigDiagnosticProvider(mockCollection);
  const content = [
    'lombok.accessors.chain = true',
    'config.stopBubbling = true'
  ].join('\n');

  const doc = createMockDoc(content);
  provider.updateDiagnostics(doc);

  const orderDiag = publishedDiags.find(d => d.code === DIAGNOSTIC_CODES.STOP_BUBBLING_ORDER);
  assert.ok(orderDiag, 'Should flag config.stopBubbling not at top of file');
});
