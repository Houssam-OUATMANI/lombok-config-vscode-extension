import * as vscode from 'vscode';
import { parseConfigText } from '../parser/configParser';

/**
 * Document formatting provider for lombok.config.
 * Normalizes spacing around operators, standardizes indentation, and cleans trailing spaces.
 */
export class LombokConfigFormattingProvider implements vscode.DocumentFormattingEditProvider {
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const text = document.getText();
    const parsed = parseConfigText(text);
    const formattedLines: string[] = [];

    const spaceAroundOperator = vscode.workspace
      .getConfiguration('lombokSense.format')
      .get<boolean>('spaceAroundOperator', true);

    const opSpacing = spaceAroundOperator ? ' ' : '';

    for (let i = 0; i < parsed.nodes.length; i++) {
      const node = parsed.nodes[i];
      const rawLine = parsed.lines[i];

      switch (node.kind) {
        case 'empty':
          formattedLines.push('');
          break;

        case 'comment': {
          // Normalize leading '#'
          const trimmed = rawLine.trim();
          formattedLines.push(trimmed);
          break;
        }

        case 'clear': {
          let line = `clear ${node.key}`;
          if (node.comment) {
            line += ` # ${node.comment.trim()}`;
          }
          formattedLines.push(line);
          break;
        }

        case 'property': {
          let line = `${node.key}${opSpacing}${node.operator}${opSpacing}${node.value}`;
          if (node.comment) {
            line += ` # ${node.comment.trim()}`;
          }
          formattedLines.push(line);
          break;
        }

        case 'malformed':
          // Keep malformed lines as-is without breaking user's in-progress typing
          formattedLines.push(rawLine.trimEnd());
          break;
      }
    }

    let result = formattedLines.join('\n');
    if (options.insertFinalNewline && !result.endsWith('\n')) {
      result += '\n';
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(text.length)
    );

    return [vscode.TextEdit.replace(fullRange, result)];
  }
}
