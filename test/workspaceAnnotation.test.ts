import './mockVscode';
import test from 'node:test';
import assert from 'node:assert/strict';
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
