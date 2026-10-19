import * as vscode from 'vscode';
import { parseConfigText, PropertyNode, ClearDirectiveNode } from '../parser/configParser';
import { findProperty } from '../model/lombokProperties';

/**
 * Document Symbol provider for lombok.config files.
 * Generates structured Outline and Breadcrumbs hierarchy in VS Code,
 * grouping properties by category with clear property values and directives.
 */
export class LombokConfigDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const text = document.getText();
    const parsed = parseConfigText(text);

    // Group properties and directives by category
    const categoryMap = new Map<string, { range: vscode.Range; children: vscode.DocumentSymbol[] }>();

    for (const node of parsed.nodes) {
      if (node.kind === 'property') {
        const propDef = findProperty(node.key);
        const category = propDef?.category ?? (node.key.startsWith('lombok.') ? 'General Lombok' : 'Configuration');

        const keyRange = new vscode.Range(
          node.keyRange.line,
          node.keyRange.startChar,
          node.keyRange.line,
          node.keyRange.endChar
        );

        const fullRange = new vscode.Range(
          node.fullRange.line,
          node.fullRange.startChar,
          node.fullRange.line,
          node.fullRange.endChar
        );

        const shortName = node.key.replace(/^(lombok|config)\./, '');
        const detail = `${node.operator} ${node.value}${node.comment ? ` (# ${node.comment.trim()})` : ''}`;

        const symbol = new vscode.DocumentSymbol(
          shortName,
          detail,
          this.getSymbolKindForType(propDef?.type),
          fullRange,
          keyRange
        );

        this.addToCategory(categoryMap, category, symbol, fullRange);
      } else if (node.kind === 'clear') {
        const category = 'List Management';
        const clearRange = new vscode.Range(
          node.clearRange.line,
          node.clearRange.startChar,
          node.clearRange.line,
          node.clearRange.endChar
        );

        const fullRange = new vscode.Range(
          node.fullRange.line,
          node.fullRange.startChar,
          node.fullRange.line,
          node.fullRange.endChar
        );

        const symbol = new vscode.DocumentSymbol(
          `clear ${node.key.replace(/^lombok\./, '')}`,
          node.comment ? `# ${node.comment.trim()}` : 'Reset list values',
          vscode.SymbolKind.Event,
          fullRange,
          clearRange
        );

        this.addToCategory(categoryMap, category, symbol, fullRange);
      }
    }

    // Convert category map into hierarchical DocumentSymbols
    const rootSymbols: vscode.DocumentSymbol[] = [];

    for (const [categoryName, data] of categoryMap) {
      if (data.children.length === 0) continue;

      // Category range wraps all children
      const firstChildRange = data.children[0].range;
      const lastChildRange = data.children[data.children.length - 1].range;
      const categoryRange = new vscode.Range(
        firstChildRange.start.line,
        0,
        lastChildRange.end.line,
        lastChildRange.end.character
      );

      const categorySymbol = new vscode.DocumentSymbol(
        categoryName,
        `${data.children.length} setting${data.children.length > 1 ? 's' : ''}`,
        vscode.SymbolKind.Namespace,
        categoryRange,
        categoryRange
      );

      categorySymbol.children = data.children;
      rootSymbols.push(categorySymbol);
    }

    return rootSymbols;
  }

  private addToCategory(
    map: Map<string, { range: vscode.Range; children: vscode.DocumentSymbol[] }>,
    category: string,
    symbol: vscode.DocumentSymbol,
    fullRange: vscode.Range
  ): void {
    let entry = map.get(category);
    if (!entry) {
      entry = { range: fullRange, children: [] };
      map.set(category, entry);
    }
    entry.children.push(symbol);
  }

  private getSymbolKindForType(type?: string): vscode.SymbolKind {
    switch (type) {
      case 'boolean':
        return vscode.SymbolKind.Boolean;
      case 'enum':
        return vscode.SymbolKind.EnumMember;
      case 'list':
        return vscode.SymbolKind.Array;
      case 'string':
      case 'identifier':
        return vscode.SymbolKind.String;
      default:
        return vscode.SymbolKind.Property;
    }
  }
}
