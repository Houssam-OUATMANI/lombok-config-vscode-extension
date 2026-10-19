import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseConfigText, ParsedConfigFile, PropertyNode, ClearDirectiveNode } from '../parser/configParser';
import { findProperty, ALL_LOMBOK_PROPERTIES } from '../model/lombokProperties';

export interface PropertyTrace {
  readonly action: 'set' | 'append' | 'remove' | 'clear';
  readonly filePath: string;
  readonly line: number;
  readonly value?: string;
}

export interface EffectiveProperty {
  readonly key: string;
  readonly type: string;
  readonly value: string | string[];
  readonly definedIn: string;
  readonly line: number;
  readonly isOverridden: boolean;
  readonly history: readonly PropertyTrace[];
}

export interface EffectiveConfigResult {
  readonly targetFilePath: string;
  readonly stopBubblingEncountered: boolean;
  readonly hierarchyFiles: readonly string[]; // Top-most parent to target file
  readonly properties: ReadonlyMap<string, EffectiveProperty>;
}

/**
 * Service to resolve multi-file lombok.config inheritance and bubbling.
 * Traverses parent directories, computes final effective settings, and traces provenance.
 */
export class ConfigHierarchyService {
  /**
   * Computes the effective configuration for a given lombok.config file.
   */
  public async computeEffectiveConfig(filePath: string): Promise<EffectiveConfigResult> {
    const hierarchyFiles = await this.resolveConfigHierarchy(filePath);
    const properties = new Map<string, {
      key: string;
      type: string;
      value: string | string[];
      definedIn: string;
      line: number;
      isOverridden: boolean;
      history: PropertyTrace[];
    }>();

    let stopBubblingEncountered = false;

    // Apply configurations from root-most parent down to the target file
    for (const file of hierarchyFiles) {
      let content = '';
      try {
        const doc = vscode.workspace.textDocuments.find(d => d.fileName === file);
        if (doc) {
          content = doc.getText();
        } else {
          content = await fs.promises.readFile(file, 'utf-8');
        }
      } catch {
        continue;
      }

      const parsed = parseConfigText(content);

      for (const node of parsed.nodes) {
        if (node.kind === 'property') {
          const lowerKey = node.key.toLowerCase();
          const propDef = findProperty(node.key);
          const type = propDef?.type ?? 'string';

          if (lowerKey === 'config.stopbubbling' && node.value.toLowerCase() === 'true') {
            stopBubblingEncountered = true;
          }

          if (type === 'list') {
            let entry = properties.get(lowerKey);
            if (!entry) {
              entry = {
                key: propDef?.key ?? node.key,
                type: 'list',
                value: [],
                definedIn: file,
                line: node.line + 1,
                isOverridden: false,
                history: []
              };
              properties.set(lowerKey, entry);
            }

            const currentList = Array.isArray(entry.value) ? entry.value : [];

            if (node.operator === '+=') {
              if (!currentList.includes(node.value)) {
                currentList.push(node.value);
              }
              entry.value = currentList;
              entry.definedIn = file;
              entry.line = node.line + 1;
              entry.history.push({
                action: 'append',
                filePath: file,
                line: node.line + 1,
                value: node.value
              });
            } else if (node.operator === '-=') {
              const idx = currentList.indexOf(node.value);
              if (idx !== -1) {
                currentList.splice(idx, 1);
              }
              entry.value = currentList;
              entry.history.push({
                action: 'remove',
                filePath: file,
                line: node.line + 1,
                value: node.value
              });
            } else {
              // '=' on list replaces entire list
              const prevDefinedIn = entry.definedIn;
              entry.value = [node.value];
              entry.definedIn = file;
              entry.line = node.line + 1;
              if (prevDefinedIn !== file) {
                entry.isOverridden = true;
              }
              entry.history.push({
                action: 'set',
                filePath: file,
                line: node.line + 1,
                value: node.value
              });
            }
          } else {
            // Scalar property
            let entry = properties.get(lowerKey);
            const prevDefinedIn = entry?.definedIn;
            const history = entry ? entry.history : [];

            history.push({
              action: 'set',
              filePath: file,
              line: node.line + 1,
              value: node.value
            });

            properties.set(lowerKey, {
              key: propDef?.key ?? node.key,
              type,
              value: node.value,
              definedIn: file,
              line: node.line + 1,
              isOverridden: !!prevDefinedIn && prevDefinedIn !== file,
              history
            });
          }
        } else if (node.kind === 'clear') {
          const lowerKey = node.key.toLowerCase();
          const propDef = findProperty(node.key);
          let entry = properties.get(lowerKey);
          if (!entry) {
            entry = {
              key: propDef?.key ?? node.key,
              type: 'list',
              value: [],
              definedIn: file,
              line: node.line + 1,
              isOverridden: false,
              history: []
            };
            properties.set(lowerKey, entry);
          }
          entry.value = [];
          entry.history.push({
            action: 'clear',
            filePath: file,
            line: node.line + 1
          });
        }
      }
    }

    return {
      targetFilePath: filePath,
      stopBubblingEncountered,
      hierarchyFiles,
      properties
    };
  }

  /**
   * Finds parent lombok.config files in order from root-most parent to the target file.
   */
  public async resolveConfigHierarchy(targetFilePath: string): Promise<string[]> {
    const chain: string[] = [];
    let currentDir = path.dirname(path.resolve(targetFilePath));

    // Safety limit of 25 directory levels
    let iterations = 0;
    while (iterations++ < 25) {
      const configPath = path.join(currentDir, 'lombok.config');
      if (fs.existsSync(configPath)) {
        chain.unshift(configPath);

        // Check if config.stopBubbling = true in this file
        try {
          const content = await fs.promises.readFile(configPath, 'utf-8');
          if (/^\s*config\.stopBubbling\s*=\s*true/m.test(content)) {
            break;
          }
        } catch {
          // ignore read error
        }
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached filesystem root
      }
      currentDir = parentDir;
    }

    // Ensure target file is included at the end
    const resolvedTarget = path.resolve(targetFilePath);
    if (!chain.includes(resolvedTarget)) {
      chain.push(resolvedTarget);
    }

    return chain;
  }

  /**
   * Generates a rich, beautiful Markdown report for the effective configuration.
   */
  public formatEffectiveConfigMarkdown(result: EffectiveConfigResult): string {
    const relTarget = vscode.workspace.asRelativePath(result.targetFilePath);
    const lines: string[] = [];

    lines.push(`# ⚡ Lombok Effective Configuration`);
    lines.push(`**Target File**: \`${relTarget}\``);
    lines.push('');
    lines.push(`### 📂 Configuration Hierarchy (${result.hierarchyFiles.length} file${result.hierarchyFiles.length > 1 ? 's' : ''})`);
    result.hierarchyFiles.forEach((file, index) => {
      const rel = vscode.workspace.asRelativePath(file);
      const isTarget = path.resolve(file) === path.resolve(result.targetFilePath);
      const marker = isTarget ? '**[Current Target]**' : `*(Parent level ${result.hierarchyFiles.length - 1 - index})*`;
      lines.push(`${index + 1}. \`${rel}\` ${marker}`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`### ⚙️ Resolved Settings (${result.properties.size} properties)`);
    lines.push('');
    lines.push('| Property | Resolved Value | Origin | Status |');
    lines.push('| :--- | :--- | :--- | :--- |');

    const sortedEntries = Array.from(result.properties.values()).sort((a, b) => a.key.localeCompare(b.key));

    for (const prop of sortedEntries) {
      const displayVal = Array.isArray(prop.value)
        ? (prop.value.length > 0 ? prop.value.map(v => `\`${v}\``).join(', ') : '*(empty list)*')
        : `\`${prop.value}\``;

      const relOrigin = vscode.workspace.asRelativePath(prop.definedIn);
      const originDisplay = `[\`${relOrigin}:${prop.line}\`](file://${prop.definedIn.replace(/\\/g, '/')})`;

      const status = prop.isOverridden
        ? '🟡 **Overridden**'
        : (path.resolve(prop.definedIn) === path.resolve(result.targetFilePath) ? '🟢 **Local**' : '🔵 **Inherited**');

      lines.push(`| **\`${prop.key}\`** | ${displayVal} | ${originDisplay} | ${status} |`);
    }

    return lines.join('\n');
  }
}
