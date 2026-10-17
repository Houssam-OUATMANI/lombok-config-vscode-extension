import * as vscode from 'vscode';
import { findProperty, LombokPropertyDef } from '../model/lombokProperties';
import { parseConfigText, ConfigNode } from '../parser/configParser';

/**
 * Rich documentation hover provider for lombok.config files.
 * Provides IntelliJ-grade Quick Documentation for keys, values, operators, and directives.
 */
export class LombokConfigHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const parsed = parseConfigText(document.getText());
    if (position.line >= parsed.nodes.length) {
      return undefined;
    }

    const node = parsed.nodes[position.line];
    const char = position.character;

    // 1. Check if hovering on 'clear' directive
    if (node.kind === 'clear') {
      if (char >= node.clearRange.startChar && char <= node.clearRange.endChar) {
        return this.createClearKeywordHover(node);
      }
      if (char >= node.keyRange.startChar && char <= node.keyRange.endChar) {
        return this.createPropertyHover(node.key, node.keyRange);
      }
      return undefined;
    }

    // 2. Check if hovering on property assignment
    if (node.kind === 'property') {
      // Hover on key
      if (char >= node.keyRange.startChar && char <= node.keyRange.endChar) {
        return this.createPropertyHover(node.key, node.keyRange);
      }

      // Hover on operator
      if (char >= node.operatorRange.startChar && char <= node.operatorRange.endChar) {
        return this.createOperatorHover(node.operator, node.operatorRange);
      }

      // Hover on value
      if (char >= node.valueRange.startChar && char <= node.valueRange.endChar) {
        return this.createValueHover(node.key, node.value, node.valueRange);
      }
    }

    // 3. Check malformed node with partial key
    if (node.kind === 'malformed' && node.partialKey && node.partialKeyRange) {
      if (char >= node.partialKeyRange.startChar && char <= node.partialKeyRange.endChar) {
        return this.createPropertyHover(node.partialKey, node.partialKeyRange);
      }
    }

    return undefined;
  }

  /**
   * Generates formatted hover card for a property key.
   */
  private createPropertyHover(rawKey: string, range: { line: number; startChar: number; endChar: number }): vscode.Hover | undefined {
    const prop = findProperty(rawKey);
    const vscodeRange = new vscode.Range(range.line, range.startChar, range.line, range.endChar);

    if (!prop) {
      const unknownMd = new vscode.MarkdownString();
      unknownMd.appendMarkdown(`### \`${rawKey}\`\n\n`);
      unknownMd.appendMarkdown('*(Unknown or custom Lombok configuration property)*');
      return new vscode.Hover(unknownMd, vscodeRange);
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    // Header & Badges
    const depBadge = prop.deprecated ? ' `[DEPRECATED]`' : '';
    md.appendMarkdown(`### \`${prop.key}\`${depBadge}\n\n`);
    md.appendMarkdown(`**Category**: ${prop.category} &nbsp;|&nbsp; **Type**: \`${prop.type}\`\n\n`);

    if (prop.deprecated) {
      md.appendMarkdown(`> ⚠️ **Deprecation Warning**: ${prop.deprecationMessage ?? 'This property is deprecated.'}\n\n`);
      if (prop.replacement) {
        md.appendMarkdown(`> **Suggested Replacement**: \`${prop.replacement}\`\n\n`);
      }
    }

    // Description
    md.appendMarkdown(`${prop.description}\n\n`);

    // Details table or list
    if (prop.defaultValue !== undefined) {
      md.appendMarkdown(`- **Default**: \`${prop.defaultValue}\`\n`);
    }

    if (prop.allowedValues && prop.allowedValues.length > 0) {
      md.appendMarkdown(`- **Allowed Values**: ${prop.allowedValues.map(v => `\`${v}\``).join(', ')}\n`);
    }

    return new vscode.Hover(md, vscodeRange);
  }

  /**
   * Generates hover card for configuration operators.
   */
  private createOperatorHover(
    operator: string,
    range: { line: number; startChar: number; endChar: number }
  ): vscode.Hover {
    const md = new vscode.MarkdownString();
    const vscodeRange = new vscode.Range(range.line, range.startChar, range.line, range.endChar);

    if (operator === '=') {
      md.appendMarkdown('### Operator `=` (Set)\n\n');
      md.appendMarkdown('Assigns or overrides the single value for this configuration key.');
    } else if (operator === '+=') {
      md.appendMarkdown('### Operator `+=` (Append)\n\n');
      md.appendMarkdown('Appends a new value to this list configuration property (e.g. `lombok.copyableAnnotations` or `lombok.accessors.prefix`).');
    } else if (operator === '-=') {
      md.appendMarkdown('### Operator `-=` (Remove)\n\n');
      md.appendMarkdown('Removes a specific value from this list configuration property.');
    }

    return new vscode.Hover(md, vscodeRange);
  }

  /**
   * Generates hover card for the 'clear' directive.
   */
  private createClearKeywordHover(
    node: ConfigNode & { clearRange: { line: number; startChar: number; endChar: number } }
  ): vscode.Hover {
    const md = new vscode.MarkdownString();
    const vscodeRange = new vscode.Range(
      node.clearRange.line,
      node.clearRange.startChar,
      node.clearRange.line,
      node.clearRange.endChar
    );

    md.appendMarkdown('### Directive `clear`\n\n');
    md.appendMarkdown(
      'Clears all previously accumulated items for a multi-valued configuration property.\n\n' +
      'This prevents values defined in parent directory `lombok.config` files from bubbling into the current directory.'
    );

    return new vscode.Hover(md, vscodeRange);
  }

  /**
   * Generates hover card for property values.
   */
  private createValueHover(
    key: string,
    value: string,
    range: { line: number; startChar: number; endChar: number }
  ): vscode.Hover | undefined {
    const prop = findProperty(key);
    const vscodeRange = new vscode.Range(range.line, range.startChar, range.line, range.endChar);

    const md = new vscode.MarkdownString();
    md.appendMarkdown(`### Value: \`${value}\`\n\n`);

    if (key.endsWith('.flagUsage')) {
      if (value === 'allow') {
        md.appendMarkdown('Allows usage of the Lombok annotation without any compiler warning.');
      } else if (value === 'warning') {
        md.appendMarkdown('Emits a compiler warning whenever this Lombok annotation is used.');
      } else if (value === 'error') {
        md.appendMarkdown('Causes compilation to abort with an error whenever this Lombok annotation is used.');
      } else {
        return undefined;
      }
      return new vscode.Hover(md, vscodeRange);
    }

    if (key.endsWith('.callSuper')) {
      if (value === 'call') {
        md.appendMarkdown('Always generates superclass method call.');
      } else if (value === 'ignore') {
        md.appendMarkdown('Silently omits superclass method call.');
      } else if (value === 'warn') {
        md.appendMarkdown('Warns when extending a class if `callSuper` is not explicitly declared.');
      } else {
        return undefined;
      }
      return new vscode.Hover(md, vscodeRange);
    }

    if (prop?.defaultValue === value) {
      md.appendMarkdown(`This is the **default value** for \`${prop.key}\`.`);
      return new vscode.Hover(md, vscodeRange);
    }

    return undefined;
  }
}
