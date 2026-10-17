import * as vscode from 'vscode';
import { ALL_LOMBOK_PROPERTIES, findProperty, LombokPropertyDef } from '../model/lombokProperties';
import { parseConfigText, getCursorContext } from '../parser/configParser';

/**
 * Intelligent completion provider for lombok.config files.
 * Provides key autocompletion, value autocompletion, and directive completion.
 */
export class LombokConfigCompletionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const parsed = parseConfigText(document.getText());
    const ctx = getCursorContext(parsed, position.line, position.character);

    switch (ctx.kind) {
      case 'value':
        return this.provideValueCompletions(ctx.node.key, ctx.node.operator);

      case 'clearTarget':
        return this.provideClearTargetCompletions();

      case 'key':
      case 'empty':
        return this.provideKeyCompletions(document, position);

      default:
        return undefined;
    }
  }

  /**
   * Provides completions for configuration keys and root directives.
   */
  private provideKeyCompletions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const lineText = document.lineAt(position.line).text;
    const lineBeforeCursor = lineText.substring(0, position.character).trimStart();
    const hasOperatorAhead = /[=+\-]/.test(lineText.substring(position.character));

    const items: vscode.CompletionItem[] = [];

    // Directive 'clear' completion at beginning of line
    if (!lineBeforeCursor.includes('.') && !hasOperatorAhead) {
      const clearItem = new vscode.CompletionItem('clear', vscode.CompletionItemKind.Keyword);
      clearItem.detail = 'Directive: reset list configuration';
      clearItem.documentation = new vscode.MarkdownString(
        'Resets all previously accumulated items for a multi-valued configuration property (such as `lombok.copyableAnnotations` or `lombok.accessors.prefix`).'
      );
      clearItem.insertText = new vscode.SnippetString('clear ${1|lombok.copyableAnnotations,lombok.accessors.prefix|}');
      clearItem.sortText = '00_clear';
      items.push(clearItem);
    }

    // Key completions
    for (const prop of ALL_LOMBOK_PROPERTIES) {
      const item = new vscode.CompletionItem(prop.key, vscode.CompletionItemKind.Property);
      item.detail = `(${prop.type}) ${prop.category}`;

      const docs = new vscode.MarkdownString();
      if (prop.deprecated) {
        docs.appendMarkdown(`⚠️ **DEPRECATED**: ${prop.deprecationMessage ?? ''}\n\n`);
        item.tags = [vscode.CompletionItemTag.Deprecated];
      }
      docs.appendMarkdown(`${prop.description}\n\n`);
      if (prop.defaultValue !== undefined) {
        docs.appendMarkdown(`- **Default**: \`${prop.defaultValue}\`\n`);
      }
      if (prop.allowedValues && prop.allowedValues.length > 0) {
        docs.appendMarkdown(`- **Allowed values**: ${prop.allowedValues.map(v => `\`${v}\``).join(', ')}\n`);
      }
      item.documentation = docs;

      // Smart snippet: if operator already exists on the line, just insert key; otherwise insert key + operator snippet
      if (hasOperatorAhead) {
        item.insertText = prop.key;
      } else {
        item.insertText = this.createKeySnippet(prop);
      }

      // Prioritize non-deprecated items and core keys
      item.sortText = prop.deprecated ? `99_${prop.key}` : `10_${prop.key}`;
      items.push(item);
    }

    return items;
  }

  /**
   * Generates a tailored snippet for a property.
   */
  private createKeySnippet(prop: LombokPropertyDef): vscode.SnippetString {
    if (prop.type === 'list') {
      return new vscode.SnippetString(`${prop.key} += \${1}`);
    }

    if (prop.allowedValues && prop.allowedValues.length > 0) {
      const choices = prop.allowedValues.join(',');
      return new vscode.SnippetString(`${prop.key} = \${1|${choices}|}`);
    }

    if (prop.defaultValue) {
      return new vscode.SnippetString(`${prop.key} = \${1:${prop.defaultValue}}`);
    }

    return new vscode.SnippetString(`${prop.key} = \${1}`);
  }

  /**
   * Provides value completions based on the property type.
   */
  private provideValueCompletions(
    rawKey: string,
    operator: string
  ): vscode.CompletionItem[] {
    const prop = findProperty(rawKey);
    if (!prop) {
      return [];
    }

    // List properties don't have a rigid enum of values (they accept class names or prefixes)
    if (prop.type === 'list') {
      if (prop.key === 'lombok.accessors.prefix') {
        const item = new vscode.CompletionItem('m_', vscode.CompletionItemKind.Value);
        item.detail = 'Example field prefix';
        item.documentation = new vscode.MarkdownString('Strips prefix like `m_` from field names when generating accessors.');
        return [item];
      }
      return [];
    }

    // Boolean or Enum properties
    if (prop.allowedValues && prop.allowedValues.length > 0) {
      return prop.allowedValues.map((val, index) => {
        const kind = prop.type === 'boolean'
          ? vscode.CompletionItemKind.Keyword
          : vscode.CompletionItemKind.EnumMember;

        const item = new vscode.CompletionItem(val, kind);
        item.detail = prop.defaultValue === val ? `(default) ${val}` : val;
        item.sortText = `${index.toString().padStart(2, '0')}_${val}`;

        // Specific documentation for known values
        item.documentation = this.getValueDocumentation(prop.key, val);
        return item;
      });
    }

    return [];
  }

  /**
   * Provides documentation for specific value choices.
   */
  private getValueDocumentation(key: string, value: string): vscode.MarkdownString {
    const docs = new vscode.MarkdownString();
    if (key.endsWith('.callSuper')) {
      if (value === 'call') {
        docs.appendMarkdown('Always generates superclass method invocation when extending a class.');
      } else if (value === 'ignore') {
        docs.appendMarkdown('Silently omits superclass method invocation.');
      } else if (value === 'warn') {
        docs.appendMarkdown('Emits a compiler warning if `callSuper` is not explicitly declared on the annotation.');
      }
    } else if (key.endsWith('.flagUsage')) {
      if (value === 'allow') {
        docs.appendMarkdown('Permits the Lombok feature with no compiler warnings.');
      } else if (value === 'warning') {
        docs.appendMarkdown('Emits a compiler warning whenever the feature is used.');
      } else if (value === 'error') {
        docs.appendMarkdown('Causes compilation to fail with an error whenever the feature is used.');
      }
    } else {
      docs.appendMarkdown(`Valid option for \`${key}\`.`);
    }
    return docs;
  }

  /**
   * Provides list target properties when typing 'clear <...>'.
   */
  private provideClearTargetCompletions(): vscode.CompletionItem[] {
    const listProps = ALL_LOMBOK_PROPERTIES.filter(p => p.type === 'list');
    return listProps.map(prop => {
      const item = new vscode.CompletionItem(prop.key, vscode.CompletionItemKind.Property);
      item.detail = '(list) Can be cleared';
      item.documentation = new vscode.MarkdownString(prop.description);
      return item;
    });
  }
}
