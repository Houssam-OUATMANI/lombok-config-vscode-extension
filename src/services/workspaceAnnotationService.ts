import * as vscode from 'vscode';

export interface ResolvedAnnotation {
  readonly fqcn: string; // Fully qualified class name, e.g. org.springframework.beans.factory.annotation.Qualifier
  readonly simpleName: string; // e.g. Qualifier
  readonly source: 'workspace' | 'dependency' | 'framework';
  readonly description?: string;
}

/**
 * Built-in index of high-frequency Java framework annotations used with Lombok.
 */
const FRAMEWORK_ANNOTATIONS: readonly ResolvedAnnotation[] = [
  // Spring Framework
  {
    fqcn: 'org.springframework.beans.factory.annotation.Qualifier',
    simpleName: 'Qualifier',
    source: 'framework',
    description: 'Spring @Qualifier: specifies target bean for autowired constructor parameters or fields'
  },
  {
    fqcn: 'org.springframework.beans.factory.annotation.Value',
    simpleName: 'Value',
    source: 'framework',
    description: 'Spring @Value: injects configuration properties into constructor parameters or fields'
  },
  {
    fqcn: 'org.springframework.beans.factory.annotation.Autowired',
    simpleName: 'Autowired',
    source: 'framework',
    description: 'Spring @Autowired: marks constructor or field for dependency injection'
  },
  {
    fqcn: 'org.springframework.context.annotation.Lazy',
    simpleName: 'Lazy',
    source: 'framework',
    description: 'Spring @Lazy: delays bean initialization'
  },
  {
    fqcn: 'org.springframework.context.annotation.Primary',
    simpleName: 'Primary',
    source: 'framework',
    description: 'Spring @Primary: gives bean preference when multiple candidates qualify'
  },
  {
    fqcn: 'org.springframework.data.annotation.Id',
    simpleName: 'Id',
    source: 'framework',
    description: 'Spring Data @Id: marks entity identifier'
  },
  {
    fqcn: 'org.springframework.data.annotation.Transient',
    simpleName: 'Transient',
    source: 'framework',
    description: 'Spring Data @Transient: excludes field from persistence'
  },
  {
    fqcn: 'org.springframework.data.annotation.CreatedDate',
    simpleName: 'CreatedDate',
    source: 'framework',
    description: 'Spring Data auditing: marks field for creation timestamp'
  },
  {
    fqcn: 'org.springframework.data.annotation.LastModifiedDate',
    simpleName: 'LastModifiedDate',
    source: 'framework',
    description: 'Spring Data auditing: marks field for modification timestamp'
  },

  // Jackson
  {
    fqcn: 'com.fasterxml.jackson.annotation.JsonProperty',
    simpleName: 'JsonProperty',
    source: 'framework',
    description: 'Jackson @JsonProperty: defines JSON property name on accessors/constructors'
  },
  {
    fqcn: 'com.fasterxml.jackson.annotation.JsonIgnore',
    simpleName: 'JsonIgnore',
    source: 'framework',
    description: 'Jackson @JsonIgnore: ignores field or accessor during JSON serialization'
  },
  {
    fqcn: 'com.fasterxml.jackson.annotation.JsonView',
    simpleName: 'JsonView',
    source: 'framework',
    description: 'Jackson @JsonView: restricts field serialization by view class'
  },
  {
    fqcn: 'com.fasterxml.jackson.annotation.JsonFormat',
    simpleName: 'JsonFormat',
    source: 'framework',
    description: 'Jackson @JsonFormat: specifies date/time/pattern format for JSON serialization'
  },
  {
    fqcn: 'com.fasterxml.jackson.annotation.JsonInclude',
    simpleName: 'JsonInclude',
    source: 'framework',
    description: 'Jackson @JsonInclude: controls whether null/empty values are serialized'
  },
  {
    fqcn: 'com.fasterxml.jackson.annotation.JsonUnwrapped',
    simpleName: 'JsonUnwrapped',
    source: 'framework',
    description: 'Jackson @JsonUnwrapped: flattens child object properties into parent JSON'
  },
  {
    fqcn: 'com.fasterxml.jackson.annotation.JsonAlias',
    simpleName: 'JsonAlias',
    source: 'framework',
    description: 'Jackson @JsonAlias: defines alternative names during deserialization'
  },

  // Jakarta / Javax Validation & Persistence
  {
    fqcn: 'jakarta.validation.Valid',
    simpleName: 'Valid',
    source: 'framework',
    description: 'Jakarta Validation @Valid: cascades validation into nested object or constructor arg'
  },
  {
    fqcn: 'jakarta.validation.constraints.NotNull',
    simpleName: 'NotNull',
    source: 'framework',
    description: 'Jakarta Validation @NotNull: validates value is not null'
  },
  {
    fqcn: 'jakarta.validation.constraints.NotBlank',
    simpleName: 'NotBlank',
    source: 'framework',
    description: 'Jakarta Validation @NotBlank: validates string is not null or whitespace'
  },
  {
    fqcn: 'jakarta.validation.constraints.NotEmpty',
    simpleName: 'NotEmpty',
    source: 'framework',
    description: 'Jakarta Validation @NotEmpty: validates collection/string is not empty'
  },
  {
    fqcn: 'jakarta.validation.constraints.Size',
    simpleName: 'Size',
    source: 'framework',
    description: 'Jakarta Validation @Size: validates size boundaries'
  },
  {
    fqcn: 'jakarta.validation.constraints.Min',
    simpleName: 'Min',
    source: 'framework',
    description: 'Jakarta Validation @Min: validates minimum numeric value'
  },
  {
    fqcn: 'jakarta.validation.constraints.Max',
    simpleName: 'Max',
    source: 'framework',
    description: 'Jakarta Validation @Max: validates maximum numeric value'
  },
  {
    fqcn: 'jakarta.annotation.Nullable',
    simpleName: 'Nullable',
    source: 'framework',
    description: 'Jakarta @Nullable: marks parameter or return type as nullable'
  },
  {
    fqcn: 'jakarta.annotation.Nonnull',
    simpleName: 'Nonnull',
    source: 'framework',
    description: 'Jakarta @Nonnull: marks parameter or return type as non-null'
  },
  {
    fqcn: 'jakarta.persistence.Id',
    simpleName: 'Id',
    source: 'framework',
    description: 'JPA @Id: primary key mapping'
  },
  {
    fqcn: 'jakarta.persistence.Column',
    simpleName: 'Column',
    source: 'framework',
    description: 'JPA @Column: database column mapping'
  },
  {
    fqcn: 'jakarta.persistence.Transient',
    simpleName: 'Transient',
    source: 'framework',
    description: 'JPA @Transient: not persisted in database'
  },
  {
    fqcn: 'javax.annotation.Nullable',
    simpleName: 'Nullable',
    source: 'framework',
    description: 'Javax @Nullable: marks element as nullable'
  },
  {
    fqcn: 'javax.annotation.Nonnull',
    simpleName: 'Nonnull',
    source: 'framework',
    description: 'Javax @Nonnull: marks element as non-null'
  },
  {
    fqcn: 'javax.validation.Valid',
    simpleName: 'Valid',
    source: 'framework',
    description: 'Javax Validation @Valid'
  },
  {
    fqcn: 'javax.validation.constraints.NotNull',
    simpleName: 'NotNull',
    source: 'framework',
    description: 'Javax Validation @NotNull'
  },

  // OpenAPI / Swagger
  {
    fqcn: 'io.swagger.v3.oas.annotations.media.Schema',
    simpleName: 'Schema',
    source: 'framework',
    description: 'OpenAPI 3.0 @Schema: defines model property documentation and type details'
  },
  {
    fqcn: 'io.swagger.v3.oas.annotations.Parameter',
    simpleName: 'Parameter',
    source: 'framework',
    description: 'OpenAPI 3.0 @Parameter: documents API method parameters'
  },

  // MapStruct
  {
    fqcn: 'org.mapstruct.Named',
    simpleName: 'Named',
    source: 'framework',
    description: 'MapStruct @Named: specifies qualifier method for bean mapping'
  },

  // JSpecify Nullability
  {
    fqcn: 'org.jspecify.annotations.NonNull',
    simpleName: 'NonNull',
    source: 'framework',
    description: 'JSpecify @NonNull: marks type use as non-null'
  },
  {
    fqcn: 'org.jspecify.annotations.Nullable',
    simpleName: 'Nullable',
    source: 'framework',
    description: 'JSpecify @Nullable: marks type use as nullable'
  },

  // Micronaut
  {
    fqcn: 'io.micronaut.core.annotation.NonNull',
    simpleName: 'NonNull',
    source: 'framework',
    description: 'Micronaut @NonNull: marks parameter or return value as non-null'
  },
  {
    fqcn: 'io.micronaut.core.annotation.Nullable',
    simpleName: 'Nullable',
    source: 'framework',
    description: 'Micronaut @Nullable: marks parameter or return value as nullable'
  },

  // Quarkus
  {
    fqcn: 'io.quarkus.runtime.annotations.RegisterForReflection',
    simpleName: 'RegisterForReflection',
    source: 'framework',
    description: 'Quarkus @RegisterForReflection: registers classes for GraalVM native image reflection'
  },

  // Additional JPA
  {
    fqcn: 'jakarta.persistence.Enumerated',
    simpleName: 'Enumerated',
    source: 'framework',
    description: 'JPA @Enumerated: specifies enum type mapping in database'
  },
  {
    fqcn: 'jakarta.persistence.Version',
    simpleName: 'Version',
    source: 'framework',
    description: 'JPA @Version: optimistic locking attribute'
  },
  {
    fqcn: 'jakarta.persistence.Basic',
    simpleName: 'Basic',
    source: 'framework',
    description: 'JPA @Basic: specifies basic persistent property'
  }
];

/**
 * Service that scans workspace Java files and dependencies to discover and index
 * custom and third-party annotations in real time.
 */
export class WorkspaceAnnotationService implements vscode.Disposable {
  private readonly workspaceAnnotations = new Map<string, ResolvedAnnotation>();
  private readonly annotationsByFile = new Map<string, Map<string, ResolvedAnnotation>>();
  private readonly fileScanGenerations = new Map<string, number>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly outputChannel = vscode.window.createOutputChannel('Lombok Sense');
  private scanCancellation: vscode.CancellationTokenSource | undefined;
  private scanPromise: Promise<void> | undefined;

  constructor() {
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('lombokSense.annotations.indexing')) {
          void this.scanWorkspace();
        }
      })
    );
    this.initWatcher();
    void this.scanWorkspace();
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
    this.scanCancellation?.cancel();
    this.scanCancellation?.dispose();
    this.scanCancellation = undefined;
    this.outputChannel.dispose();
    this.workspaceAnnotations.clear();
    this.annotationsByFile.clear();
    this.fileScanGenerations.clear();
  }

  /**
   * Returns all resolved annotations (both built-in frameworks and dynamic workspace annotations).
   */
  public getAnnotations(filterPrefix = ''): ResolvedAnnotation[] {
    const results = new Map<string, ResolvedAnnotation>();

    // 1. Add framework annotations
    for (const ann of FRAMEWORK_ANNOTATIONS) {
      results.set(ann.fqcn, ann);
    }

    // 2. Add dynamically discovered workspace annotations
    for (const [fqcn, ann] of this.workspaceAnnotations) {
      if (!results.has(fqcn)) {
        results.set(fqcn, ann);
      }
    }

    const all = Array.from(results.values());

    if (!filterPrefix) {
      return all;
    }

    const lowerPrefix = filterPrefix.toLowerCase();
    return all.filter(
      a =>
        a.fqcn.toLowerCase().includes(lowerPrefix) ||
        a.simpleName.toLowerCase().includes(lowerPrefix)
    );
  }

  /**
   * Watches for changes in Java files to update the annotation index incrementally.
   */
  private initWatcher(): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.java');
    watcher.onDidCreate(uri => { if (!this.isExcluded(uri)) void this.scanJavaFile(uri); }, this, this.disposables);
    watcher.onDidChange(uri => { if (!this.isExcluded(uri)) void this.scanJavaFile(uri); }, this, this.disposables);
    watcher.onDidDelete(
      uri => {
        if (this.isExcluded(uri)) {
          return;
        }
        const key = uri.toString();
        this.fileScanGenerations.set(key, (this.fileScanGenerations.get(key) ?? 0) + 1);
        this.annotationsByFile.delete(key);
        this.rebuildWorkspaceAnnotations();
      },
      this,
      this.disposables
    );

    this.disposables.push(watcher);
  }

  /**
   * Scans all .java files across workspace folders to discover annotation definitions and imports.
   */
  public scanWorkspace(): Promise<void> {
    this.scanCancellation?.cancel();
    this.scanCancellation?.dispose();
    const cancellation = new vscode.CancellationTokenSource();
    this.scanCancellation = cancellation;

    const scanPromise = this.runWorkspaceScan(cancellation.token).finally(() => {
      cancellation.dispose();
      if (this.scanCancellation === cancellation) {
        this.scanCancellation = undefined;
        this.scanPromise = undefined;
      }
    });
    this.scanPromise = scanPromise;
    return scanPromise;
  }

  private async runWorkspaceScan(token: vscode.CancellationToken): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('lombokSense.annotations.indexing');
      if (!config.get<boolean>('enabled', true)) {
        if (!token.isCancellationRequested) {
          this.annotationsByFile.clear();
          this.workspaceAnnotations.clear();
        }
        return;
      }

      const configuredLimit = config.get<number>('maxFiles', 500);
      const maxFiles = Number.isFinite(configuredLimit)
        ? Math.min(10000, Math.max(1, Math.floor(configuredLimit)))
        : 500;
      const excludePatterns = this.getExcludePatterns(config);
      const javaFiles = await vscode.workspace.findFiles(
        '**/*.java',
        `{${excludePatterns.join(',')}}`,
        maxFiles + 1,
        token
      );
      if (token.isCancellationRequested) {
        return;
      }

      const selectedFiles = javaFiles.slice(0, maxFiles);
      const selectedKeys = new Set(selectedFiles.map(file => file.toString()));
      if (javaFiles.length <= maxFiles) {
        for (const key of this.annotationsByFile.keys()) {
          if (!selectedKeys.has(key)) {
            this.annotationsByFile.delete(key);
          }
        }
        this.rebuildWorkspaceAnnotations();
      } else {
        this.outputChannel.appendLine(
          `Annotation indexing is limited to ${maxFiles} Java files. Increase lombokSense.annotations.indexing.maxFiles to index more.`
        );
      }

      for (let i = 0; i < selectedFiles.length && !token.isCancellationRequested; i += 12) {
        await Promise.all(selectedFiles.slice(i, i + 12).map(file => this.scanJavaFile(file, token)));
      }
    } catch (error) {
      if (!token.isCancellationRequested) {
        this.outputChannel.appendLine(`Failed to index workspace annotations: ${this.errorMessage(error)}`);
      }
    }
  }

  /**
   * Inspects a single .java file for package, @interface definitions, and annotation imports.
   */
  private async scanJavaFile(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<void> {
    const key = uri.toString();
    const generation = (this.fileScanGenerations.get(key) ?? 0) + 1;
    this.fileScanGenerations.set(key, generation);

    try {
      const fileBytes = await vscode.workspace.fs.readFile(uri);
      if (token?.isCancellationRequested) {
        return;
      }
      const text = Buffer.from(fileBytes).toString('utf-8');
      const sourceCode = this.stripCommentsAndLiterals(text);
      const discovered = new Map<string, ResolvedAnnotation>();

      // 1. Extract package
      const packageMatch = sourceCode.match(/^\s*package\s+([a-zA-Z0-9_.]+);/m);
      const packageName = packageMatch ? packageMatch[1] : '';

      // 2. Discover custom annotations declared in this file: @interface Name
      const annotationMatches = sourceCode.matchAll(/@interface\s+([a-zA-Z0-9_]+)/g);
      for (const match of annotationMatches) {
        const simpleName = match[1];
        const fqcn = packageName ? `${packageName}.${simpleName}` : simpleName;
        discovered.set(fqcn, {
          fqcn,
          simpleName,
          source: 'workspace',
          description: `Custom annotation defined in workspace (${vscode.workspace.asRelativePath(uri)})`
        });
      }

      // 3. Discover imported annotations used in this file
      // Matches imports of annotations like `import org.springframework.beans.factory.annotation.Qualifier;`
      const importMatches = sourceCode.matchAll(/^\s*import\s+([a-zA-Z0-9_.]+);/gm);
      for (const imp of importMatches) {
        const fullImport = imp[1];
        const simpleName = fullImport.split('.').pop() ?? fullImport;

        // Check if simpleName looks like an annotation (starts with capital letter) and is actually used with '@' in file
        const annotationUsageRegex = new RegExp(`@${simpleName}\\b`);
        if (/^[A-Z]/.test(simpleName) && annotationUsageRegex.test(sourceCode)) {
          discovered.set(fullImport, {
            fqcn: fullImport,
            simpleName,
            source: 'dependency',
            description: `Annotation imported and used in ${vscode.workspace.asRelativePath(uri)}. The import may resolve from a project dependency.`
          });
        }
      }
      if (!token?.isCancellationRequested && this.fileScanGenerations.get(key) === generation) {
        this.annotationsByFile.set(key, discovered);
        this.rebuildWorkspaceAnnotations();
      }
    } catch (error) {
      this.outputChannel.appendLine(`Failed to read Java file ${uri.fsPath}: ${this.errorMessage(error)}`);
    }
  }

  private rebuildWorkspaceAnnotations(): void {
    this.workspaceAnnotations.clear();
    for (const annotations of this.annotationsByFile.values()) {
      for (const [fqcn, annotation] of annotations) {
        const existing = this.workspaceAnnotations.get(fqcn);
        if (!existing || (annotation.source === 'workspace' && existing.source !== 'workspace')) {
          this.workspaceAnnotations.set(fqcn, annotation);
        }
      }
    }
  }

  private getExcludePatterns(config: vscode.WorkspaceConfiguration): string[] {
    const defaults = [
      '**/node_modules/**',
      '**/target/**',
      '**/build/**',
      '**/.gradle/**',
      '**/.idea/**',
      '**/bin/**',
      '**/out/**',
      '**/dist/**'
    ];
    const configured = config.get<unknown[]>('exclude', []);
    const custom = Array.isArray(configured)
      ? configured.filter((pattern): pattern is string => typeof pattern === 'string' && pattern.trim().length > 0)
      : [];
    return [...new Set([...defaults, ...custom.map(pattern => pattern.trim())])];
  }

  private isExcluded(uri: vscode.Uri): boolean {
    const config = vscode.workspace.getConfiguration('lombokSense.annotations.indexing');
    const patterns = this.getExcludePatterns(config);
    const normalizedPath = uri.fsPath.replace(/\\/g, '/');
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    return workspaceFolders.some(folder => {
      const root = folder.uri.fsPath.replace(/\\/g, '/').replace(/\/+$/, '');
      const relativePath = normalizedPath.startsWith(`${root}/`)
        ? normalizedPath.slice(root.length + 1)
        : normalizedPath;
      return patterns.some(pattern => this.matchesGlob(relativePath, pattern));
    });
  }

  private matchesGlob(path: string, glob: string): boolean {
    let regex = '^';
    let braceDepth = 0;
    for (let index = 0; index < glob.length; index++) {
      const character = glob[index];
      if (character === '*' && glob[index + 1] === '*') {
        index++;
        if (glob[index + 1] === '/') {
          index++;
          regex += '(?:.*/)?';
        } else {
          regex += '.*';
        }
      } else if (character === '*') {
        regex += '[^/]*';
      } else if (character === '?') {
        regex += '[^/]';
      } else if (character === '{') {
        braceDepth++;
        regex += '(?:';
      } else if (character === '}' && braceDepth > 0) {
        braceDepth--;
        regex += ')';
      } else if (character === ',' && braceDepth > 0) {
        regex += '|';
      } else {
        regex += character.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      }
    }
    return new RegExp(`${regex}$`).test(path);
  }

  private stripCommentsAndLiterals(text: string): string {
    return text.replace(
      /"""[\s\S]*?"""|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
      match => match.replace(/[^\r\n]/g, ' ')
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
