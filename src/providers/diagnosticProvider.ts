import * as vscode from 'vscode';
import { ALL_LOMBOK_PROPERTIES, findProperty, LombokPropertyDef } from '../model/lombokProperties';
import { parseConfigText, ParsedConfigFile, PropertyNode, ClearDirectiveNode, MalformedNode } from '../parser/configParser';
import { findClosestMatch } from '../utils/levenshtein';

export const DIAGNOSTIC_CODES = {
  UNKNOWN_KEY: 'lombok.unknown-key',
  DEPRECATED_KEY: 'lombok.deprecated-key',
  INVALID_OPERATOR: 'lombok.invalid-operator',
  INVALID_VALUE: 'lombok.invalid-value',
  CLEAR_NON_LIST: 'lombok.clear-non-list',
  SYNTAX_ERROR: 'lombok.syntax-error',
  DUPLICATE_KEY: 'lombok.duplicate-key',
  INVALID_KEY_CASING: 'lombok.invalid-key-casing',
  STOP_BUBBLING_ORDER: 'lombok.stop-bubbling-order'
} as const;

export interface LintConfig {
  unknownKeys: vscode.DiagnosticSeverity | null;
  deprecatedKeys: vscode.DiagnosticSeverity | null;
  invalidValues: vscode.DiagnosticSeverity | null;
  invalidOperators: vscode.DiagnosticSeverity | null;
}

/**
 * Diagnostic provider for real-time validation of lombok.config files.
 */
export class LombokConfigDiagnosticProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly knownKeys: readonly string[];

  constructor(collection: vscode.DiagnosticCollection) {
    this.diagnosticCollection = collection;
    this.knownKeys = ALL_LOMBOK_PROPERTIES.map(p => p.key);
  }

  /**
   * Validates document and publishes diagnostics.
   */
  public updateDiagnostics(document: vscode.TextDocument): void {
    if (document.languageId !== 'lombok-config' && !document.fileName.endsWith('lombok.config')) {
      return;
    }

    const config = this.getLintConfig();
    const parsed = parseConfigText(document.getText());
    const diagnostics: vscode.Diagnostic[] = [];

    // Pre-pass: map scalar property assignments to detect duplicate overrides
    const scalarOccurrences = new Map<string, PropertyNode[]>();
    let seenNonStopBubblingProperty = false;
    let stopBubblingOrderWrong = false;

    for (const node of parsed.nodes) {
      if (node.kind === 'property') {
        const lower = node.key.toLowerCase();
        const prop = findProperty(node.key);
        if (prop && prop.type !== 'list') {
          const list = scalarOccurrences.get(lower) ?? [];
          list.push(node);
          scalarOccurrences.set(lower, list);
        }

        if (lower === 'config.stopbubbling') {
          if (seenNonStopBubblingProperty) {
            stopBubblingOrderWrong = true;
          }
        } else {
          seenNonStopBubblingProperty = true;
        }
      }
    }

    for (const node of parsed.nodes) {
      if (node.kind === 'property') {
        this.validatePropertyNode(node, config, diagnostics, scalarOccurrences, stopBubblingOrderWrong);
      } else if (node.kind === 'clear') {
        this.validateClearNode(node, config, diagnostics);
      } else if (node.kind === 'malformed') {
        this.validateMalformedNode(node, diagnostics);
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Clears diagnostics for a document when closed.
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Validates a standard property assignment node.
   */
  private validatePropertyNode(
    node: PropertyNode,
    config: LintConfig,
    diagnostics: vscode.Diagnostic[],
    scalarOccurrences: Map<string, PropertyNode[]>,
    stopBubblingOrderWrong: boolean
  ): void {
    const prop = findProperty(node.key);
    const keyRange = new vscode.Range(
      node.keyRange.line,
      node.keyRange.startChar,
      node.keyRange.line,
      node.keyRange.endChar
    );

    // 1. Check for Unknown Key
    if (!prop) {
      if (config.unknownKeys !== null) {
        const suggestion = findClosestMatch(node.key, this.knownKeys);
        let msg = `Unknown Lombok configuration key: '${node.key}'.`;
        if (suggestion) {
          msg += ` Did you mean '${suggestion}'?`;
        }

        const diag = new vscode.Diagnostic(keyRange, msg, config.unknownKeys);
        diag.code = DIAGNOSTIC_CODES.UNKNOWN_KEY;
        diag.source = 'Lombok';
        diagnostics.push(diag);
      }
      return;
    }

    // 2. Check for Incorrect Key Casing
    if (node.key !== prop.key) {
      const msg = `Configuration key '${node.key}' should be lowercase '${prop.key}'.`;
      const diag = new vscode.Diagnostic(keyRange, msg, vscode.DiagnosticSeverity.Warning);
      diag.code = DIAGNOSTIC_CODES.INVALID_KEY_CASING;
      diag.source = 'Lombok';
      diagnostics.push(diag);
    }

    // 3. Check for Duplicate Overridden Scalar Keys
    if (prop.type !== 'list') {
      const occurrences = scalarOccurrences.get(node.key.toLowerCase());
      if (occurrences && occurrences.length > 1) {
        const lastOccurrence = occurrences[occurrences.length - 1];
        if (node !== lastOccurrence) {
          const msg = `Duplicate key '${node.key}'. This assignment is overridden by line ${lastOccurrence.line + 1}.`;
          const diag = new vscode.Diagnostic(keyRange, msg, vscode.DiagnosticSeverity.Warning);
          diag.code = DIAGNOSTIC_CODES.DUPLICATE_KEY;
          diag.tags = [vscode.DiagnosticTag.Unnecessary];
          diag.source = 'Lombok';
          diagnostics.push(diag);
        }
      }
    }

    // 4. Check for config.stopBubbling placement order
    if (node.key.toLowerCase() === 'config.stopbubbling' && stopBubblingOrderWrong) {
      const msg = `'config.stopBubbling' should ideally be declared at the top of the configuration file.`;
      const diag = new vscode.Diagnostic(keyRange, msg, vscode.DiagnosticSeverity.Information);
      diag.code = DIAGNOSTIC_CODES.STOP_BUBBLING_ORDER;
      diag.source = 'Lombok';
      diagnostics.push(diag);
    }

    // 5. Check for Deprecated Key
    if (prop.deprecated && config.deprecatedKeys !== null) {
      const msg = `Deprecated configuration key '${node.key}'. ${prop.deprecationMessage ?? ''}`;
      const diag = new vscode.Diagnostic(keyRange, msg, config.deprecatedKeys);
      diag.code = DIAGNOSTIC_CODES.DEPRECATED_KEY;
      diag.tags = [vscode.DiagnosticTag.Deprecated];
      diag.source = 'Lombok';
      diagnostics.push(diag);
    }

    // 3. Check for Invalid Operator on non-list properties
    if ((node.operator === '+=' || node.operator === '-=') && prop.type !== 'list') {
      if (config.invalidOperators !== null) {
        const opRange = new vscode.Range(
          node.operatorRange.line,
          node.operatorRange.startChar,
          node.operatorRange.line,
          node.operatorRange.endChar
        );
        const msg = `Operator '${node.operator}' is only valid on multi-valued list properties. Use '=' for '${prop.key}'.`;
        const diag = new vscode.Diagnostic(opRange, msg, config.invalidOperators);
        diag.code = DIAGNOSTIC_CODES.INVALID_OPERATOR;
        diag.source = 'Lombok';
        diagnostics.push(diag);
      }
    }

    // 4. Check for Invalid Value
    if (config.invalidValues !== null && node.value.length > 0) {
      const valRange = new vscode.Range(
        node.valueRange.line,
        node.valueRange.startChar,
        node.valueRange.line,
        node.valueRange.endChar
      );

      if (prop.type === 'boolean') {
        const lowerVal = node.value.toLowerCase();
        if (lowerVal !== 'true' && lowerVal !== 'false') {
          const msg = `Invalid boolean value '${node.value}' for '${prop.key}'. Expected 'true' or 'false'.`;
          const diag = new vscode.Diagnostic(valRange, msg, config.invalidValues);
          diag.code = DIAGNOSTIC_CODES.INVALID_VALUE;
          diag.source = 'Lombok';
          diagnostics.push(diag);
        }
      } else if (prop.type === 'enum' && prop.allowedValues) {
        const matched = prop.allowedValues.some(
          allowed => allowed.toLowerCase() === node.value.toLowerCase()
        );
        if (!matched) {
          const validList = prop.allowedValues.map(v => `'${v}'`).join(', ');
          const suggestion = findClosestMatch(node.value, prop.allowedValues, 3);
          let msg = `Invalid value '${node.value}' for '${prop.key}'. Allowed values: ${validList}.`;
          if (suggestion) {
            msg += ` Did you mean '${suggestion}'?`;
          }
          const diag = new vscode.Diagnostic(valRange, msg, config.invalidValues);
          diag.code = DIAGNOSTIC_CODES.INVALID_VALUE;
          diag.source = 'Lombok';
          diagnostics.push(diag);
        }
      }
    }
  }

  /**
   * Validates a 'clear' directive node.
   */
  private validateClearNode(
    node: ClearDirectiveNode,
    config: LintConfig,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (!node.key) {
      const range = new vscode.Range(
        node.clearRange.line,
        node.clearRange.startChar,
        node.clearRange.line,
        node.clearRange.endChar
      );
      const diag = new vscode.Diagnostic(
        range,
        "Directive 'clear' requires a target configuration key (e.g. 'clear lombok.copyableAnnotations').",
        vscode.DiagnosticSeverity.Error
      );
      diag.code = DIAGNOSTIC_CODES.SYNTAX_ERROR;
      diag.source = 'Lombok';
      diagnostics.push(diag);
      return;
    }

    const prop = findProperty(node.key);
    const keyRange = new vscode.Range(
      node.keyRange.line,
      node.keyRange.startChar,
      node.keyRange.line,
      node.keyRange.endChar
    );

    if (!prop) {
      if (config.unknownKeys !== null) {
        const suggestion = findClosestMatch(node.key, this.knownKeys);
        let msg = `Unknown Lombok configuration key: '${node.key}'.`;
        if (suggestion) {
          msg += ` Did you mean '${suggestion}'?`;
        }
        const diag = new vscode.Diagnostic(keyRange, msg, config.unknownKeys);
        diag.code = DIAGNOSTIC_CODES.UNKNOWN_KEY;
        diag.source = 'Lombok';
        diagnostics.push(diag);
      }
      return;
    }

    if (prop.type !== 'list') {
      const msg = `Directive 'clear' cannot be applied to scalar property '${prop.key}'. It can only be used on list properties.`;
      const diag = new vscode.Diagnostic(keyRange, msg, vscode.DiagnosticSeverity.Warning);
      diag.code = DIAGNOSTIC_CODES.CLEAR_NON_LIST;
      diag.source = 'Lombok';
      diagnostics.push(diag);
    }
  }

  /**
   * Validates a malformed syntax node.
   */
  private validateMalformedNode(node: MalformedNode, diagnostics: vscode.Diagnostic[]): void {
    const range = new vscode.Range(
      node.fullRange.line,
      node.fullRange.startChar,
      node.fullRange.line,
      node.fullRange.endChar
    );
    const diag = new vscode.Diagnostic(range, node.reason, vscode.DiagnosticSeverity.Error);
    diag.code = DIAGNOSTIC_CODES.SYNTAX_ERROR;
    diag.source = 'Lombok';
    diagnostics.push(diag);
  }

  /**
   * Reads current configuration settings for lint severities.
   */
  private getLintConfig(): LintConfig {
    const config = vscode.workspace.getConfiguration('lombokSense.lint');
    return {
      unknownKeys: this.toSeverity(config.get<string>('unknownKeys', 'warning')),
      deprecatedKeys: this.toSeverity(config.get<string>('deprecatedKeys', 'warning')),
      invalidValues: this.toSeverity(config.get<string>('invalidValues', 'error')),
      invalidOperators: this.toSeverity(config.get<string>('invalidOperators', 'error'))
    };
  }

  /**
   * Maps configuration string to vscode.DiagnosticSeverity or null (disabled).
   */
  private toSeverity(val: string): vscode.DiagnosticSeverity | null {
    switch (val) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'information':
        return vscode.DiagnosticSeverity.Information;
      case 'hint':
        return vscode.DiagnosticSeverity.Hint;
      default:
        return null;
    }
  }
}
