import * as vscode from 'vscode';
import { parseConfigText, getCursorContext } from '../parser/configParser';
import { ConfigHierarchyService } from '../services/configHierarchyService';
import { WorkspaceAnnotationService } from '../services/workspaceAnnotationService';

/**
 * Definition Provider (Go-To-Definition / F12) for lombok.config.
 * Enables jumping directly to:
 * 1. Java @interface source definitions for copyableAnnotations.
 * 2. Parent lombok.config definitions when a property overrides a parent setting.
 */
export class LombokConfigDefinitionProvider implements vscode.DefinitionProvider {
  private readonly hierarchyService: ConfigHierarchyService;
  private readonly annotationService: WorkspaceAnnotationService;

  constructor(
    hierarchyService: ConfigHierarchyService,
    annotationService: WorkspaceAnnotationService
  ) {
    this.hierarchyService = hierarchyService;
    this.annotationService = annotationService;
  }

  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    const text = document.getText();
    const parsed = parseConfigText(text);
    const ctx = getCursorContext(parsed, position.line, position.character);

    // 1. Definition for Annotation Values (e.g. in lombok.copyableAnnotations)
    if (ctx.kind === 'value' && ctx.node.key === 'lombok.copyableAnnotations') {
      const annotationFqcn = ctx.node.value.trim();
      const simpleName = annotationFqcn.split('.').pop() ?? annotationFqcn;

      // Find in workspace
      const matches = await vscode.workspace.findFiles(
        `**/${simpleName}.java`,
        '{**/node_modules/**,**/target/**,**/build/**}',
        5
      );

      if (matches.length > 0) {
        // Return location of the Java file
        return new vscode.Location(matches[0], new vscode.Position(0, 0));
      }
    }

    // 2. Definition for Property Keys (Jump to Parent lombok.config declaration if overridden)
    if (ctx.kind === 'key' && ctx.node && ctx.node.kind === 'property') {
      const key = ctx.node.key;
      const hierarchy = await this.hierarchyService.resolveConfigHierarchy(document.fileName);

      // Look in parent configs (all except current document)
      const currentResolved = document.fileName;
      const parentFiles = hierarchy.filter(f => f.toLowerCase() !== currentResolved.toLowerCase());

      for (let i = parentFiles.length - 1; i >= 0; i--) {
        const parentFile = parentFiles[i];
        try {
          const doc = await vscode.workspace.openTextDocument(parentFile);
          const parentParsed = parseConfigText(doc.getText());

          const match = parentParsed.nodes.find(
            n => (n.kind === 'property' || n.kind === 'clear') && n.key.toLowerCase() === key.toLowerCase()
          );

          if (match) {
            const matchLine = match.line;
            const targetUri = vscode.Uri.file(parentFile);
            return new vscode.Location(targetUri, new vscode.Position(matchLine, 0));
          }
        } catch {
          // ignore read error
        }
      }
    }

    return undefined;
  }
}
