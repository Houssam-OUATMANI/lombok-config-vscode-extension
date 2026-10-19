import * as vscode from 'vscode';
import { findProperty, LombokPropertyDef } from '../model/lombokProperties';
import { parseConfigText, ConfigNode } from '../parser/configParser';
import { WorkspaceAnnotationService } from '../services/workspaceAnnotationService';

const PROPERTY_JAVA_EXAMPLES: Record<string, string> = {
  'lombok.accessors.fluent': `// Generated methods without get/set prefixes:
public String name() { return this.name; }
public Person name(String name) { this.name = name; return this; }`,

  'lombok.accessors.chain': `// Setters return 'this' for method chaining:
public Person setName(String name) {
    this.name = name;
    return this;
}`,

  'lombok.accessors.prefix': `// Field: String m_name;
// Accessor generator strips 'm_' prefix:
public String getName() { return this.m_name; }`,

  'lombok.getter.noIsPrefix': `// For boolean fields:
public boolean getActive() { return this.active; } // instead of isActive()`,

  'lombok.addLombokGeneratedAnnotation': `// Generated methods annotated for JaCoCo exclusion:
@lombok.Generated
public String getName() { return this.name; }`,

  'lombok.builder.className': `// Custom builder pattern name:
Person.PersonBuilder builder = Person.builder();`,

  'lombok.fieldDefaults.defaultPrivate': `// Class field without explicit modifier defaults to private:
private String email;`,

  'lombok.log.fieldName': `// Logger field initialized with chosen name:
private static final Logger log = LoggerFactory.getLogger(MyService.class);`,

  'lombok.copyableAnnotations': `// Copies annotation to generated getter and constructor param:
@JsonProperty("user_id")
private Long userId;`
};

/**
 * Rich documentation hover provider for lombok.config files.
 * Provides comprehensive Quick Documentation for keys, values, operators, and directives.
 */
export class LombokConfigHoverProvider implements vscode.HoverProvider {
  private readonly annotationService?: WorkspaceAnnotationService;

  constructor(annotationService?: WorkspaceAnnotationService) {
    this.annotationService = annotationService;
  }
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

    // Code example preview if available
    const example = PROPERTY_JAVA_EXAMPLES[prop.key];
    if (example) {
      md.appendMarkdown(`\n**Java Code Example**:\n\`\`\`java\n${example}\n\`\`\`\n`);
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

    // Annotation hover for lombok.copyableAnnotations
    if (key === 'lombok.copyableAnnotations' && this.annotationService) {
      const match = this.annotationService.getAnnotations().find(a => a.fqcn === value);
      if (match) {
        md.appendMarkdown(`### Annotation: \`@${match.simpleName}\`\n\n`);
        md.appendMarkdown(`**Source**: ${match.source === 'workspace' ? 'Workspace' : 'Framework Library'}\n\n`);
        md.appendMarkdown(`**Class**: \`${match.fqcn}\`\n\n`);
        if (match.description) {
          md.appendMarkdown(`${match.description}\n\n`);
        }
        md.appendMarkdown(
          'Lombok will copy this annotation from fields onto generated getters, setters, withers, and constructors.'
        );
        return new vscode.Hover(md, vscodeRange);
      }
    }

    if (prop?.defaultValue === value) {
      md.appendMarkdown(`This is the **default value** for \`${prop.key}\`.`);
      return new vscode.Hover(md, vscodeRange);
    }

    return undefined;
  }
}
