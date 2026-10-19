import './mockVscode';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { ConfigHierarchyService } from '../src/services/configHierarchyService';
import { LombokConfigInlayHintProvider } from '../src/providers/inlayHintProvider';
import { LombokConfigHoverProvider } from '../src/providers/hoverProvider';
import { WorkspaceAnnotationService } from '../src/services/workspaceAnnotationService';

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

test('ConfigHierarchyService formats effective config markdown report', async () => {
  const service = new ConfigHierarchyService();
  const report = service.formatEffectiveConfigMarkdown({
    targetFilePath: 'd:/project/submodule/lombok.config',
    stopBubblingEncountered: true,
    hierarchyFiles: [
      'd:/project/lombok.config',
      'd:/project/submodule/lombok.config'
    ],
    properties: new Map([
      ['lombok.accessors.fluent', {
        key: 'lombok.accessors.fluent',
        type: 'boolean',
        value: 'true',
        definedIn: 'd:/project/submodule/lombok.config',
        line: 2,
        isOverridden: true,
        history: []
      }],
      ['lombok.copyableannotations', {
        key: 'lombok.copyableAnnotations',
        type: 'list',
        value: ['org.springframework.beans.factory.annotation.Qualifier'],
        definedIn: 'd:/project/lombok.config',
        line: 5,
        isOverridden: false,
        history: []
      }]
    ])
  });

  assert.ok(report.includes('⚡ Lombok Effective Configuration'));
  assert.ok(report.includes('lombok.accessors.fluent'));
  assert.ok(report.includes('lombok.copyableAnnotations'));
  assert.ok(report.includes('Overridden'));
});

test('InlayHintProvider provides property type hints and annotation badges', () => {
  const annotationService = new WorkspaceAnnotationService();
  const provider = new LombokConfigInlayHintProvider(annotationService);

  const content = [
    'lombok.accessors.fluent = true',
    'lombok.copyableAnnotations += org.springframework.beans.factory.annotation.Qualifier'
  ].join('\n');

  const doc = createMockDoc(content);
  const hints = provider.provideInlayHints(doc, new vscode.Range(0, 0, 1, 50), {} as vscode.CancellationToken) as vscode.InlayHint[];

  assert.ok(hints);
  assert.ok(hints.length >= 2);

  // Check type hint for fluent
  const typeHint = hints.find(h => h.label.includes('boolean'));
  assert.ok(typeHint, 'Should include (boolean) type hint');

  // Check badge for Qualifier
  const badgeHint = hints.find(h => h.label.includes('Qualifier'));
  assert.ok(badgeHint, 'Should include [Qualifier] badge hint');
});

test('HoverProvider includes syntax-highlighted Java code example', () => {
  const provider = new LombokConfigHoverProvider();
  const content = 'lombok.accessors.fluent = true';
  const doc = createMockDoc(content);

  const hover = provider.provideHover(doc, new vscode.Position(0, 5), {} as vscode.CancellationToken) as vscode.Hover;
  assert.ok(hover);
  const md = (hover as any).contents[0]?.value ?? '';
  assert.ok(md.includes('Java Code Example'));
  assert.ok(md.includes('public String name()'));
});
