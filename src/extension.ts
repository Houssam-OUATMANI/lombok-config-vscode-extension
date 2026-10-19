import * as vscode from 'vscode';
import { LombokConfigCompletionProvider } from './providers/completionProvider';
import { LombokConfigHoverProvider } from './providers/hoverProvider';
import { LombokConfigDiagnosticProvider } from './providers/diagnosticProvider';
import { LombokConfigCodeActionProvider } from './providers/codeActionProvider';
import { LombokConfigFormattingProvider } from './providers/formattingProvider';
import { LombokConfigDocumentSymbolProvider } from './providers/symbolProvider';
import { WorkspaceAnnotationService } from './services/workspaceAnnotationService';

const LOMBOK_CONFIG_SELECTOR: vscode.DocumentSelector = [
  { language: 'lombok-config' },
  { pattern: '**/lombok.config' }
];

/**
 * Extension activation callback.
 */
export function activate(context: vscode.ExtensionContext): void {
  // 0. Workspace Annotation Service (scans workspace Java files & dependencies)
  const annotationService = new WorkspaceAnnotationService();
  context.subscriptions.push(annotationService);
  // 1. Diagnostic Collection & Provider
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('lombokSense');
  const diagnosticProvider = new LombokConfigDiagnosticProvider(diagnosticCollection);
  context.subscriptions.push(diagnosticCollection);

  // Debounced document change listener for real-time validation
  let debounceTimer: NodeJS.Timeout | undefined;
  const debouncedValidate = (document: vscode.TextDocument) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      diagnosticProvider.updateDiagnostics(document);
    }, 200);
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      debouncedValidate(event.document);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => {
      diagnosticProvider.updateDiagnostics(doc);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(doc => {
      diagnosticProvider.clearDiagnostics(doc);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('lombokSense')) {
        for (const doc of vscode.workspace.textDocuments) {
          diagnosticProvider.updateDiagnostics(doc);
        }
      }
    })
  );

  // Validate all currently open documents
  for (const doc of vscode.workspace.textDocuments) {
    diagnosticProvider.updateDiagnostics(doc);
  }

  // 2. Autocompletion Provider
  const completionProvider = new LombokConfigCompletionProvider(annotationService);
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      LOMBOK_CONFIG_SELECTOR,
      completionProvider,
      '.', '=', ' ', '+', '-'
    )
  );

  // 3. Hover Documentation Provider
  const hoverProvider = new LombokConfigHoverProvider(annotationService);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(LOMBOK_CONFIG_SELECTOR, hoverProvider)
  );

  // 4. Code Actions (Quick Fixes) Provider
  const codeActionProvider = new LombokConfigCodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      LOMBOK_CONFIG_SELECTOR,
      codeActionProvider,
      { providedCodeActionKinds: LombokConfigCodeActionProvider.providedCodeActionKinds }
    )
  );

  // 5. Document Formatting Provider
  const formattingProvider = new LombokConfigFormattingProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      LOMBOK_CONFIG_SELECTOR,
      formattingProvider
    )
  );

  // 6. Document Symbol (Outline & Breadcrumbs) Provider
  const symbolProvider = new LombokConfigDocumentSymbolProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      LOMBOK_CONFIG_SELECTOR,
      symbolProvider
    )
  );
}

/**
 * Extension deactivation callback.
 */
export function deactivate(): void {
  // Clean up handled automatically by context.subscriptions
}
