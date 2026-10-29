import './mockVscode';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mockVscode } from './mockVscode';
import { WorkspaceAnnotationService } from '../src/services/workspaceAnnotationService';

test('provides default framework annotations including Spring @Qualifier', () => {
  // Since we are running in node test environment without full VS Code runtime,
  // constructor calls scanWorkspace which catches gracefully
  const service = new WorkspaceAnnotationService();
  const allAnnotations = service.getAnnotations();

  assert.ok(allAnnotations.length > 10);

  const qualifier = allAnnotations.find(
    a => a.fqcn === 'org.springframework.beans.factory.annotation.Qualifier'
  );
  assert.ok(qualifier, 'Spring @Qualifier must be indexed');
  assert.equal(qualifier?.simpleName, 'Qualifier');
  assert.equal(qualifier?.source, 'framework');

  const valueAnn = allAnnotations.find(
    a => a.fqcn === 'org.springframework.beans.factory.annotation.Value'
  );
  assert.ok(valueAnn, 'Spring @Value must be indexed');

  const jsonProp = allAnnotations.find(
    a => a.fqcn === 'com.fasterxml.jackson.annotation.JsonProperty'
  );
  assert.ok(jsonProp, 'Jackson @JsonProperty must be indexed');
});

test('filters annotations by prefix or simple name', () => {
  const service = new WorkspaceAnnotationService();

  const springMatches = service.getAnnotations('org.springframework');
  assert.ok(springMatches.length >= 5);
  for (const match of springMatches) {
    assert.ok(match.fqcn.startsWith('org.springframework'));
  }

  const qualifierMatches = service.getAnnotations('qualifier');
  assert.equal(qualifierMatches.length, 1);
  assert.equal(
    qualifierMatches[0].fqcn,
    'org.springframework.beans.factory.annotation.Qualifier'
  );
});

test('refreshes annotations when a workspace Java file changes', async () => {
  const file = mockVscode.Uri.file('d:/project/src/CustomAnnotations.java');
  let source = 'package example;\n@interface FirstAnnotation {}\n// @interface CommentedAnnotation {}';
  const previousFindFiles = mockVscode.workspace.findFiles;
  const previousReadFile = mockVscode.workspace.fs.readFile;
  mockVscode.workspace.findFiles = async () => [file];
  mockVscode.workspace.fs.readFile = async () => Buffer.from(source);

  const service = new WorkspaceAnnotationService();
  try {
    await service.scanWorkspace();
    assert.ok(service.getAnnotations().some(annotation => annotation.fqcn === 'example.FirstAnnotation'));
    assert.ok(!service.getAnnotations().some(annotation => annotation.fqcn === 'example.CommentedAnnotation'));

    source = 'package example;\n@interface SecondAnnotation {}';
    await service.scanWorkspace();
    const workspaceAnnotations = service.getAnnotations().filter(annotation => annotation.source === 'workspace');
    assert.ok(workspaceAnnotations.some(annotation => annotation.fqcn === 'example.SecondAnnotation'));
    assert.ok(!workspaceAnnotations.some(annotation => annotation.fqcn === 'example.FirstAnnotation'));

    source = 'package example;\nimport example.Commented;\n// @Commented\nclass Example { String text = "@Commented"; }';
    await service.scanWorkspace();
    assert.ok(!service.getAnnotations().some(annotation => annotation.fqcn === 'example.Commented'));
  } finally {
    service.dispose();
    mockVscode.workspace.findFiles = previousFindFiles;
    mockVscode.workspace.fs.readFile = previousReadFile;
  }
});

test('indexes imported dependency annotations and accepts custom exclude globs', async () => {
  const file = mockVscode.Uri.file('d:/project/src/Example.java');
  const source = [
    'package example;',
    'import com.acme.annotations.Audited;',
    'import org.springframework.beans.factory.annotation.Qualifier;',
    '@Audited class Example { @Qualifier String value; }'
  ].join('\n');
  const previousFindFiles = mockVscode.workspace.findFiles;
  const previousReadFile = mockVscode.workspace.fs.readFile;
  const previousConfig = mockVscode.workspace.configurationValues;
  let excludeGlob = '';
  mockVscode.workspace.configurationValues = {
    'lombokSense.annotations.indexing.exclude': ['**/generated/**']
  };
  mockVscode.workspace.findFiles = async (_include, exclude) => {
    excludeGlob = exclude ?? '';
    return [file];
  };
  mockVscode.workspace.fs.readFile = async () => Buffer.from(source);

  const service = new WorkspaceAnnotationService();
  try {
    await service.scanWorkspace();
    const audited = service.getAnnotations().find(annotation => annotation.fqcn === 'com.acme.annotations.Audited');
    assert.ok(audited);
    assert.equal(audited?.source, 'dependency');

    const qualifier = service.getAnnotations().find(
      annotation => annotation.fqcn === 'org.springframework.beans.factory.annotation.Qualifier'
    );
    assert.equal(qualifier?.source, 'framework');
    assert.ok(excludeGlob.includes('**/generated/**'));
  } finally {
    service.dispose();
    mockVscode.workspace.findFiles = previousFindFiles;
    mockVscode.workspace.fs.readFile = previousReadFile;
    mockVscode.workspace.configurationValues = previousConfig;
  }
});

test('cancels a superseded workspace scan', async () => {
  const file = mockVscode.Uri.file('d:/project/src/Latest.java');
  const previousFindFiles = mockVscode.workspace.findFiles;
  const previousReadFile = mockVscode.workspace.fs.readFile;
  let firstToken: { isCancellationRequested: boolean } | undefined;
  let finishFirstScan: ((files: any[]) => void) | undefined;
  let calls = 0;

  mockVscode.workspace.findFiles = async (_include, _exclude, _maxResults, token) => {
    calls++;
    if (calls === 1) {
      firstToken = token;
      return new Promise(resolve => {
        finishFirstScan = resolve;
      });
    }
    return [file];
  };
  mockVscode.workspace.fs.readFile = async () => Buffer.from('package example;\n@interface LatestAnnotation {}');

  const service = new WorkspaceAnnotationService();
  try {
    await service.scanWorkspace();
    assert.equal(firstToken?.isCancellationRequested, true);
    assert.ok(service.getAnnotations().some(annotation => annotation.fqcn === 'example.LatestAnnotation'));
    finishFirstScan?.([]);
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(service.getAnnotations().some(annotation => annotation.fqcn === 'example.LatestAnnotation'));
  } finally {
    finishFirstScan?.([]);
    service.dispose();
    mockVscode.workspace.findFiles = previousFindFiles;
    mockVscode.workspace.fs.readFile = previousReadFile;
  }
});

test('does not index Java files excluded by custom watcher globs', async () => {
  const previousFindFiles = mockVscode.workspace.findFiles;
  const previousReadFile = mockVscode.workspace.fs.readFile;
  const previousFolders = mockVscode.workspace.workspaceFolders;
  const previousConfig = mockVscode.workspace.configurationValues;
  let reads = 0;
  mockVscode.workspace.watcherListeners.create.length = 0;
  mockVscode.workspace.workspaceFolders = [{ uri: { fsPath: 'd:/project' } }];
  mockVscode.workspace.configurationValues = {
    'lombokSense.annotations.indexing.exclude': ['**/{generated,build}/**']
  };
  mockVscode.workspace.findFiles = async () => [];
  mockVscode.workspace.fs.readFile = async () => {
    reads++;
    return Buffer.from('package example;\n@interface Included {}');
  };

  const service = new WorkspaceAnnotationService();
  try {
    await service.scanWorkspace();
    const onCreate = mockVscode.workspace.watcherListeners.create.at(-1);
    onCreate?.(mockVscode.Uri.file('d:/project/src/generated/Excluded.java'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reads, 0);

    onCreate?.(mockVscode.Uri.file('d:/project/src/main/Included.java'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reads, 1);
  } finally {
    service.dispose();
    mockVscode.workspace.findFiles = previousFindFiles;
    mockVscode.workspace.fs.readFile = previousReadFile;
    mockVscode.workspace.workspaceFolders = previousFolders;
    mockVscode.workspace.configurationValues = previousConfig;
  }
});
