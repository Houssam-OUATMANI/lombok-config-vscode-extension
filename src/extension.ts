import * as vscode from 'vscode';
import { LombokConfigCompletionProvider } from './providers/completionProvider';
import { LombokConfigHoverProvider } from './providers/hoverProvider';
import { LombokConfigDiagnosticProvider } from './providers/diagnosticProvider';
import { LombokConfigCodeActionProvider } from './providers/codeActionProvider';
import { LombokConfigFormattingProvider } from './providers/formattingProvider';
import { LombokConfigDocumentSymbolProvider } from './providers/symbolProvider';
import { LombokConfigDefinitionProvider } from './providers/definitionProvider';
import { LombokConfigInlayHintProvider } from './providers/inlayHintProvider';
import { WorkspaceAnnotationService } from './services/workspaceAnnotationService';
import { ConfigHierarchyService } from './services/configHierarchyService';

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

  // 7. Hierarchy Service & Definition Provider (Go-To-Definition / F12)
  const hierarchyService = new ConfigHierarchyService();
  const definitionProvider = new LombokConfigDefinitionProvider(hierarchyService, annotationService);
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      LOMBOK_CONFIG_SELECTOR,
      definitionProvider
    )
  );

  // 8. Inlay Hints Provider
  const inlayHintProvider = new LombokConfigInlayHintProvider(annotationService);
  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(
      LOMBOK_CONFIG_SELECTOR,
      inlayHintProvider
    )
  );

  // 9. Command: Show Effective Configuration
  context.subscriptions.push(
    vscode.commands.registerCommand('lombokSense.showEffectiveConfig', async (uri?: vscode.Uri) => {
      const activeUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!activeUri) {
        vscode.window.showWarningMessage('Please open a lombok.config file first.');
        return;
      }

      try {
        const result = await hierarchyService.computeEffectiveConfig(activeUri.fsPath);
        const markdown = hierarchyService.formatEffectiveConfigMarkdown(result);

        const doc = await vscode.workspace.openTextDocument({
          content: markdown,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to resolve effective Lombok configuration: ${err.message}`);
      }
    })
  );

  // 10. Command: Create Root lombok.config
  context.subscriptions.push(
    vscode.commands.registerCommand('lombokSense.createRootConfig', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
      }

      const rootFolder = workspaceFolders[0].uri;
      const targetFile = vscode.Uri.joinPath(rootFolder, 'lombok.config');

      const existingFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(rootFolder, 'lombok.config'),
        undefined,
        1
      );
      if (existingFiles.length > 0) {
        const overwrite = await vscode.window.showWarningMessage(
          'A lombok.config already exists at the workspace root. Do you want to overwrite it?',
          { modal: true },
          'Overwrite'
        );
        if (overwrite !== 'Overwrite') {
          return;
        }
      }

      const template = [
        '# ============================================================================== #',
        '# Root Project Lombok Configuration                                             #',
        '# ============================================================================== #',
        '',
        '# Stop bubbling configuration search up the directory hierarchy',
        'config.stopBubbling = true',
        '',
        '# Code generation flags (enables JaCoCo coverage exclusions)',
        'lombok.addLombokGeneratedAnnotation = true',
        '',
        '# Accessors configuration',
        'lombok.accessors.chain = true',
        'lombok.accessors.fluent = false',
        '',
        '# EqualsAndHashCode & ToString safety',
        'lombok.equalsAndHashCode.callSuper = warn',
        'lombok.toString.callSuper = warn',
        '',
        '# Logging defaults',
        'lombok.log.fieldName = log',
        'lombok.log.fieldIsStatic = true',
        ''
      ].join('\n');

      try {
        await vscode.workspace.fs.writeFile(targetFile, Buffer.from(template, 'utf-8'));
        const doc = await vscode.workspace.openTextDocument(targetFile);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('Root lombok.config successfully created!');
      } catch (err: any) {
        vscode.window.showErrorMessage(`Could not create root lombok.config: ${err.message}`);
      }
    })
  );
}

/**
 * Extension deactivation callback.
 */
export function deactivate(): void {
  // Clean up handled automatically by context.subscriptions
}
