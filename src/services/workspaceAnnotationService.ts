import * as vscode from 'vscode';

export interface ResolvedAnnotation {
  readonly fqcn: string; // Fully qualified class name, e.g. org.springframework.beans.factory.annotation.Qualifier
  readonly simpleName: string; // e.g. Qualifier
  readonly source: 'workspace' | 'framework';
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
  }
];

/**
 * Service that scans workspace Java files and dependencies to discover and index
 * custom and third-party annotations in real time.
 */
export class WorkspaceAnnotationService implements vscode.Disposable {
  private readonly workspaceAnnotations = new Map<string, ResolvedAnnotation>();
  private readonly disposables: vscode.Disposable[] = [];
  private isScanning = false;

  constructor() {
    this.initWatcher();
    this.scanWorkspace();
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
    this.workspaceAnnotations.clear();
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
      results.set(fqcn, ann);
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

    watcher.onDidCreate(uri => this.scanJavaFile(uri), this, this.disposables);
    watcher.onDidChange(uri => this.scanJavaFile(uri), this, this.disposables);
    watcher.onDidDelete(
      uri => {
        // Remove annotations from this file path if tracked
        const filePath = uri.fsPath;
        for (const [fqcn, item] of this.workspaceAnnotations.entries()) {
          if (item.description?.includes(filePath)) {
            this.workspaceAnnotations.delete(fqcn);
          }
        }
      },
      this,
      this.disposables
    );

    this.disposables.push(watcher);
  }

  /**
   * Scans all .java files across workspace folders to discover annotation definitions and imports.
   */
  public async scanWorkspace(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      // Find up to 500 Java files to index custom annotations and imports rapidly
      const javaFiles = await vscode.workspace.findFiles('**/*.java', '**/node_modules/**', 500);

      for (const fileUri of javaFiles) {
        await this.scanJavaFile(fileUri);
      }
    } catch {
      // Ignore background scan errors
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Inspects a single .java file for package, @interface definitions, and annotation imports.
   */
  private async scanJavaFile(uri: vscode.Uri): Promise<void> {
    try {
      const fileBytes = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(fileBytes).toString('utf-8');

      // 1. Extract package
      const packageMatch = text.match(/^\s*package\s+([a-zA-Z0-9_.]+);/m);
      const packageName = packageMatch ? packageMatch[1] : '';

      // 2. Discover custom annotations declared in this file: @interface Name
      const annotationMatches = text.matchAll(/@interface\s+([a-zA-Z0-9_]+)/g);
      for (const match of annotationMatches) {
        const simpleName = match[1];
        const fqcn = packageName ? `${packageName}.${simpleName}` : simpleName;
        this.workspaceAnnotations.set(fqcn, {
          fqcn,
          simpleName,
          source: 'workspace',
          description: `Custom annotation defined in workspace (${vscode.workspace.asRelativePath(uri)})`
        });
      }

      // 3. Discover imported annotations used in this file
      // Matches imports of annotations like `import org.springframework.beans.factory.annotation.Qualifier;`
      const importMatches = text.matchAll(/^\s*import\s+([a-zA-Z0-9_.]+);/gm);
      for (const imp of importMatches) {
        const fullImport = imp[1];
        const simpleName = fullImport.split('.').pop() ?? fullImport;

        // Check if simpleName looks like an annotation (starts with capital letter) and is actually used with '@' in file
        const annotationUsageRegex = new RegExp(`@${simpleName}\\b`);
        if (/^[A-Z]/.test(simpleName) && annotationUsageRegex.test(text)) {
          if (!this.workspaceAnnotations.has(fullImport)) {
            this.workspaceAnnotations.set(fullImport, {
              fqcn: fullImport,
              simpleName,
              source: 'workspace',
              description: `Annotation imported & used in workspace (${vscode.workspace.asRelativePath(uri)})`
            });
          }
        }
      }
    } catch {
      // Ignore file reading errors
    }
  }
}
