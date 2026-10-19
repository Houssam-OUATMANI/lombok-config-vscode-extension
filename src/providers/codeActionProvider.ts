import * as vscode from 'vscode';
import { DIAGNOSTIC_CODES } from './diagnosticProvider';
import { findProperty } from '../model/lombokProperties';

/**
 * Quick Fix CodeAction provider for resolving Lombok configuration diagnostics with one click.
 */
export class LombokConfigCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (typeof diagnostic.code !== 'string') {
        continue;
      }

      switch (diagnostic.code) {
        case DIAGNOSTIC_CODES.UNKNOWN_KEY:
          this.handleUnknownKey(document, diagnostic, actions);
          break;

        case DIAGNOSTIC_CODES.DEPRECATED_KEY:
          this.handleDeprecatedKey(document, diagnostic, actions);
          break;

        case DIAGNOSTIC_CODES.INVALID_OPERATOR:
          this.handleInvalidOperator(document, diagnostic, actions);
          break;

        case DIAGNOSTIC_CODES.INVALID_VALUE:
          this.handleInvalidValue(document, diagnostic, actions);
          break;

        case DIAGNOSTIC_CODES.DUPLICATE_KEY:
          this.handleDuplicateKey(document, diagnostic, actions);
          break;

        case DIAGNOSTIC_CODES.INVALID_KEY_CASING:
          this.handleInvalidKeyCasing(document, diagnostic, actions);
          break;

        case DIAGNOSTIC_CODES.CLEAR_NON_LIST:
          this.handleClearNonList(document, diagnostic, actions);
          break;

        case DIAGNOSTIC_CODES.STOP_BUBBLING_ORDER:
          this.handleStopBubblingOrder(document, diagnostic, actions);
          break;
      }
    }

    return actions;
  }

  /**
   * Provides quick fix for typos in configuration keys.
   */
  private handleUnknownKey(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    const match = diagnostic.message.match(/Did you mean '([^']+)'\?/);
    if (!match) return;

    const suggestedKey = match[1];
    const action = new vscode.CodeAction(
      `Change key to '${suggestedKey}'`,
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, suggestedKey);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }

  /**
   * Provides quick fix for deprecated keys with recommended replacements.
   */
  private handleDeprecatedKey(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    const currentKey = document.getText(diagnostic.range);
    const prop = findProperty(currentKey);
    if (!prop?.replacement) return;

    // Check if replacement replaces whole line or just key
    const action = new vscode.CodeAction(
      `Update deprecated property to modern configuration`,
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();

    if (prop.replacement.includes('=')) {
      // Replaces full line
      const lineRange = document.lineAt(diagnostic.range.start.line).range;
      action.edit.replace(document.uri, lineRange, prop.replacement);
    } else {
      action.edit.replace(document.uri, diagnostic.range, prop.replacement);
    }

    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }

  /**
   * Provides quick fix for using '+=' or '-=' on scalar properties.
   */
  private handleInvalidOperator(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    const action = new vscode.CodeAction(
      "Replace with '=' assignment operator",
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, '=');
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }

  /**
   * Provides quick fix suggestions for invalid boolean and enum values.
   */
  private handleInvalidValue(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    // Check if suggested value in message
    const match = diagnostic.message.match(/Did you mean '([^']+)'\?/);
    if (match) {
      const suggestedVal = match[1];
      const action = new vscode.CodeAction(
        `Change value to '${suggestedVal}'`,
        vscode.CodeActionKind.QuickFix
      );
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(document.uri, diagnostic.range, suggestedVal);
      action.diagnostics = [diagnostic];
      action.isPreferred = true;
      actions.push(action);
      return;
    }

    // Boolean suggestions
    if (diagnostic.message.includes("Expected 'true' or 'false'")) {
      for (const val of ['true', 'false']) {
        const action = new vscode.CodeAction(
          `Change value to '${val}'`,
          vscode.CodeActionKind.QuickFix
        );
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, diagnostic.range, val);
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }
  }

  /**
   * Provides quick fix to delete duplicate overridden property assignment.
   */
  private handleDuplicateKey(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    const action = new vscode.CodeAction(
      'Remove duplicate property assignment',
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    // Delete full line including trailing newline if possible
    const deleteRange = diagnostic.range.start.line < document.lineCount - 1
      ? new vscode.Range(line.range.start, document.lineAt(diagnostic.range.start.line + 1).range.start)
      : line.range;
    action.edit.delete(document.uri, deleteRange);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }

  /**
   * Provides quick fix to correct property key casing.
   */
  private handleInvalidKeyCasing(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    const match = diagnostic.message.match(/should be lowercase '([^']+)'/);
    if (!match) return;

    const correctKey = match[1];
    const action = new vscode.CodeAction(
      `Change key casing to '${correctKey}'`,
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, correctKey);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }

  /**
   * Provides quick fix to remove invalid 'clear' directive on scalar property.
   */
  private handleClearNonList(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    const action = new vscode.CodeAction(
      "Remove invalid 'clear' directive",
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const deleteRange = diagnostic.range.start.line < document.lineCount - 1
      ? new vscode.Range(line.range.start, document.lineAt(diagnostic.range.start.line + 1).range.start)
      : line.range;
    action.edit.delete(document.uri, deleteRange);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }

  /**
   * Provides quick fix to move config.stopBubbling = true to the top of the file.
   */
  private handleStopBubblingOrder(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    actions: vscode.CodeAction[]
  ): void {
    const action = new vscode.CodeAction(
      "Move 'config.stopBubbling' to top of file",
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    const deleteRange = diagnostic.range.start.line < document.lineCount - 1
      ? new vscode.Range(line.range.start, document.lineAt(diagnostic.range.start.line + 1).range.start)
      : line.range;

    action.edit.delete(document.uri, deleteRange);
    action.edit.insert(document.uri, new vscode.Position(0, 0), `${lineText}\n`);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }
}

