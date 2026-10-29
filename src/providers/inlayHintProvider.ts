import * as vscode from 'vscode';
import { parseConfigText } from '../parser/configParser';
import { findProperty } from '../model/lombokProperties';
import { WorkspaceAnnotationService } from '../services/workspaceAnnotationService';

/**
 * Inlay Hints provider for lombok.config.
 * Displays helpful contextual hints in the editor:
 * - Property types (boolean, enum, list)
 * - Default values when explicitly configured
 * - Annotation origin badges [Spring, Jackson, Workspace]
 */
export class LombokConfigInlayHintProvider implements vscode.InlayHintsProvider {
  private readonly annotationService: WorkspaceAnnotationService;

  constructor(annotationService: WorkspaceAnnotationService) {
    this.annotationService = annotationService;
  }

  public provideInlayHints(
    document: vscode.TextDocument,
    _range: vscode.Range,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.InlayHint[]> {
    const text = document.getText();
    const parsed = parseConfigText(text);
    const hints: vscode.InlayHint[] = [];

    for (const node of parsed.nodes) {
      if (node.kind === 'property') {
        const prop = findProperty(node.key);
        if (!prop) continue;

        // 1. Type hint after key or operator
        const keyEndPos = new vscode.Position(node.keyRange.line, node.keyRange.endChar);
        const typeHint = new vscode.InlayHint(
          keyEndPos,
          ` (${prop.type})`,
          vscode.InlayHintKind.Type
        );
        typeHint.tooltip = `Property type: ${prop.type}. Category: ${prop.category}`;
        hints.push(typeHint);

        // 2. Annotation origin badge on lombok.copyableAnnotations
        if (node.key === 'lombok.copyableAnnotations' && node.value) {
          const ann = this.annotationService.getAnnotations().find(a => a.fqcn === node.value.trim());
          if (ann) {
            const valEndPos = new vscode.Position(node.valueRange.line, node.valueRange.endChar);
            const sourceBadge = ann.source === 'workspace'
              ? ' [Workspace]'
              : ann.source === 'dependency'
                ? ' [Dependency]'
                : ` [${ann.simpleName}]`;
            const badgeHint = new vscode.InlayHint(
              valEndPos,
              sourceBadge,
              vscode.InlayHintKind.Parameter
            );
            badgeHint.tooltip = ann.description ?? `Annotation source: ${ann.source}`;
            hints.push(badgeHint);
          }
        }
      }
    }

    return hints;
  }
}
