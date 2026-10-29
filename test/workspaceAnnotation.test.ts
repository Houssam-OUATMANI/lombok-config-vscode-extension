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
