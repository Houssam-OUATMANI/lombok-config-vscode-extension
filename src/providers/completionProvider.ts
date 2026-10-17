import * as vscode from 'vscode';
import { ALL_LOMBOK_PROPERTIES, findProperty, LombokPropertyDef } from '../model/lombokProperties';
import { parseConfigText, getCursorContext } from '../parser/configParser';
import { WorkspaceAnnotationService } from '../services/workspaceAnnotationService';

/**
 * Intelligent completion provider for lombok.config files.
 * Provides key autocompletion, value autocompletion, directive completion,
 * and live workspace Java annotation resolution with accurate replacement ranges.
 */
export class LombokConfigCompletionProvider implements vscode.CompletionItemProvider {
  private readonly annotationService: WorkspaceAnnotationService;

  constructor(annotationService: WorkspaceAnnotationService) {
    this.annotationService = annotationService;
  }

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionList> {
    const text = document.getText();
    const parsed = parseConfigText(text);
    const ctx = getCursorContext(parsed, position.line, position.character);

    switch (ctx.kind) {
      case 'value':
        return this.provideValueCompletions(document, position, ctx.node.key, ctx.node.operator, ctx.prefix);

      case 'clearTarget':
        return this.provideClearTargetCompletions(document, position);

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
  ): vscode.CompletionList {
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, position.character);
    const textAfterCursor = lineText.substring(position.character);

    // Compute key replacement range
    const leadingWhitespaceMatch = lineText.match(/^(\s*)/);
    const startChar = leadingWhitespaceMatch ? leadingWhitespaceMatch[1].length : 0;

    // Detect if an assignment operator already exists ahead on the line
    const operatorAheadMatch = textAfterCursor.match(/^([^\s=+\-]*)\s*(\+=|-=|=)/);
    const hasOperatorAhead = /[=+\-]/.test(textAfterCursor);

    // Find the end of the key token on the line
    const wordAfterMatch = textAfterCursor.match(/^([a-zA-Z0-9_.-]*)/);
    const endChar = position.character + (wordAfterMatch ? wordAfterMatch[1].length : 0);

    const replacementRange = new vscode.Range(
      position.line,
      startChar,
      position.line,
      Math.max(startChar, endChar)
    );

    const items: vscode.CompletionItem[] = [];
    const prefixBeforeCursor = textBeforeCursor.trim();

    // 1. Directive 'clear' completion at beginning of line
    if (!prefixBeforeCursor.includes('.') && !hasOperatorAhead) {
      const clearItem = new vscode.CompletionItem('clear', vscode.CompletionItemKind.Keyword);
      clearItem.detail = 'Directive: reset list configuration';
      clearItem.documentation = new vscode.MarkdownString(
        'Resets all previously accumulated items for a multi-valued configuration property (such as `lombok.copyableAnnotations` or `lombok.accessors.prefix`).'
      );
      clearItem.range = replacementRange;
      clearItem.insertText = new vscode.SnippetString('clear ${1|lombok.copyableAnnotations,lombok.accessors.prefix|}');
      clearItem.filterText = 'clear';
      clearItem.sortText = '00_clear';
      items.push(clearItem);
    }

    // 2. Key completions
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

      // Explicit replacement range ensures seamless replacement on new lines
      item.range = replacementRange;

      // Filter text includes full key, key without prefix, and leaf name for fast fuzzy matching
      const shortKey = prop.key.replace(/^(lombok|config)\./, '');
      const leafKey = prop.key.split('.').pop() ?? prop.key;
      item.filterText = `${prop.key} ${shortKey} ${leafKey}`;

      if (hasOperatorAhead) {
        item.insertText = prop.key;
      } else {
        item.insertText = this.createKeySnippet(prop);
      }

      item.sortText = prop.deprecated ? `99_${prop.key}` : `10_${prop.key}`;
      items.push(item);
    }

    return new vscode.CompletionList(items, false);
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
   * Provides value completions based on the property type and live workspace resolution.
   */
  private provideValueCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    rawKey: string,
    _operator: string,
    currentPrefix: string
  ): vscode.CompletionList {
    const prop = findProperty(rawKey);
    if (!prop) {
      return new vscode.CompletionList([], false);
    }

    const lineText = document.lineAt(position.line).text;
    const opMatch = lineText.match(/(\+=|-=|=)(\s*)/);
    const valStart = opMatch && opMatch.index !== undefined
      ? opMatch.index + opMatch[0].length
      : position.character;

    const textAfterCursor = lineText.substring(position.character);
    const commentIndex = textAfterCursor.indexOf('#');
    const nonCommentAfter = commentIndex !== -1 ? textAfterCursor.substring(0, commentIndex) : textAfterCursor;
    const valEnd = position.character + nonCommentAfter.trimEnd().length;

    const valueRange = new vscode.Range(
      position.line,
      valStart,
      position.line,
      Math.max(valStart, Math.max(position.character, valEnd))
    );

    const items: vscode.CompletionItem[] = [];

    // List properties resolution
    if (prop.type === 'list') {
      if (prop.key === 'lombok.accessors.prefix') {
        const item = new vscode.CompletionItem('m_', vscode.CompletionItemKind.Value);
        item.detail = 'Example field prefix';
        item.documentation = new vscode.MarkdownString('Strips prefix like `m_` from field names when generating accessors.');
        item.range = valueRange;
        item.insertText = 'm_';
        item.filterText = 'm_';
        items.push(item);
      }

      // Dynamic resolution of copyable annotations from workspace & framework indexes
      if (prop.key === 'lombok.copyableAnnotations') {
        const annotations = this.annotationService.getAnnotations(currentPrefix);
        for (let idx = 0; idx < annotations.length; idx++) {
          const ann = annotations[idx];
          const item = new vscode.CompletionItem(ann.fqcn, vscode.CompletionItemKind.Class);
          item.detail = `@${ann.simpleName} (${ann.source === 'workspace' ? 'Workspace' : 'Framework'})`;

          const docs = new vscode.MarkdownString();
          docs.appendMarkdown(`### \`@${ann.simpleName}\`\n\n`);
          docs.appendMarkdown(`**Fully Qualified Name**: \`${ann.fqcn}\`\n\n`);
          if (ann.description) {
            docs.appendMarkdown(`${ann.description}\n\n`);
          }
          docs.appendMarkdown(
            'Lombok will copy this annotation from fields onto generated getters, setters, withers, and constructors.'
          );
          item.documentation = docs;
          item.range = valueRange;
          item.insertText = ann.fqcn;
          item.filterText = `${ann.fqcn} ${ann.simpleName}`;
          item.sortText = `${idx.toString().padStart(3, '0')}_${ann.fqcn}`;
          items.push(item);
        }
      }

      return new vscode.CompletionList(items, false);
    }

    // Boolean or Enum properties
    if (prop.allowedValues && prop.allowedValues.length > 0) {
      prop.allowedValues.forEach((val, index) => {
        const kind = prop.type === 'boolean'
          ? vscode.CompletionItemKind.Keyword
          : vscode.CompletionItemKind.EnumMember;

        const item = new vscode.CompletionItem(val, kind);
        item.detail = prop.defaultValue === val ? `(default) ${val}` : val;
        item.sortText = `${index.toString().padStart(2, '0')}_${val}`;
        item.documentation = this.getValueDocumentation(prop.key, val);
        item.range = valueRange;
        item.insertText = val;
        item.filterText = val;
        items.push(item);
      });
    }

    return new vscode.CompletionList(items, false);
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
  private provideClearTargetCompletions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionList {
    const lineText = document.lineAt(position.line).text;
    const clearMatch = lineText.match(/^(\s*clear\s+)/);
    const targetStart = clearMatch ? clearMatch[1].length : position.character;
    const targetRange = new vscode.Range(
      position.line,
      targetStart,
      position.line,
      Math.max(targetStart, position.character)
    );

    const listProps = ALL_LOMBOK_PROPERTIES.filter(p => p.type === 'list');
    const items = listProps.map(prop => {
      const item = new vscode.CompletionItem(prop.key, vscode.CompletionItemKind.Property);
      item.detail = '(list) Can be cleared';
      item.documentation = new vscode.MarkdownString(prop.description);
      item.range = targetRange;
      item.insertText = prop.key;
      item.filterText = `${prop.key} ${prop.key.replace(/^lombok\./, '')}`;
      return item;
    });

    return new vscode.CompletionList(items, false);
  }
}
