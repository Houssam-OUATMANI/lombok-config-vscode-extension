/**
 * Metadata definition and repository for Project Lombok configuration keys.
 * All property descriptions and constraints follow official Project Lombok specifications.
 */

export type PropertyType = 'boolean' | 'enum' | 'string' | 'list' | 'identifier';

export interface LombokPropertyDef {
  readonly key: string;
  readonly type: PropertyType;
  readonly allowedValues?: readonly string[];
  readonly defaultValue?: string;
  readonly description: string;
  readonly category: string;
  readonly deprecated?: boolean;
  readonly deprecationMessage?: string;
  readonly replacement?: string;
}

export const LOMBOK_PROPERTIES: readonly LombokPropertyDef[] = [
  // --- Root / Stop Bubbling ---
  {
    key: 'config.stopBubbling',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Configuration',
    description: 'Tells the configuration system not to look in parent directories for more `lombok.config` files.'
  },

  // --- Code Generation & Annotations ---
  {
    key: 'lombok.addLombokGeneratedAnnotation',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Code Generation',
    description: 'When `true`, Lombok adds `@lombok.Generated` to all generated methods, constructors, and types. This helps code coverage tools (such as JaCoCo) ignore generated code.'
  },
  {
    key: 'lombok.addJavaxGeneratedAnnotation',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Code Generation',
    description: 'When `true`, Lombok adds `@javax.annotation.Generated` to generated classes.'
  },
  {
    key: 'lombok.addJakartaGeneratedAnnotation',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Code Generation',
    description: 'When `true`, Lombok adds `@jakarta.annotation.Generated` to generated classes.'
  },
  {
    key: 'lombok.addNullAnnotations',
    type: 'enum',
    allowedValues: [
      'none',
      'javax',
      'eclipse',
      'jetbrains',
      'android',
      'androidx',
      'findbugs',
      'spring',
      'checkerframework'
    ],
    defaultValue: 'none',
    category: 'Nullability',
    description: 'Specifies which nullability annotations Lombok should add to generated getters, setters, and parameters.'
  },

  // --- Accessors ---
  {
    key: 'lombok.accessors.fluent',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Accessors',
    description: 'If `true`, generated getters and setters will be fluent (e.g. `foo()` instead of `getFoo()`, and `foo(String x)` instead of `setFoo(String x)`).'
  },
  {
    key: 'lombok.accessors.chain',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Accessors',
    description: 'If `true`, generated setters will return `this` to allow method chaining instead of `void`.'
  },
  {
    key: 'lombok.accessors.prefix',
    type: 'list',
    category: 'Accessors',
    description: 'A list of prefixes to strip from field names when generating accessors (e.g. `+= m_` or `+= f_`). Supports `+=`, `-=`, and `clear`.'
  },
  {
    key: 'lombok.accessors.capitalization',
    type: 'enum',
    allowedValues: ['basic', 'beanspec'],
    defaultValue: 'basic',
    category: 'Accessors',
    description: 'Controls how Lombok capitalizes field names with a single leading lower-case letter followed by an upper-case letter (e.g., `uName`). `beanspec` preserves JavaBean specification quirks.'
  },
  {
    key: 'lombok.accessors.makeFinal',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Accessors',
    description: 'If `true`, generated getters will be declared `final`.'
  },

  // --- Constructors ---
  {
    key: 'lombok.anyConstructor.addConstructorProperties',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Constructors',
    description: 'If `true`, `@AllArgsConstructor`, `@RequiredArgsConstructor`, and `@NoArgsConstructor` will add `@java.beans.ConstructorProperties`.'
  },
  {
    key: 'lombok.anyConstructor.suppressConstructorProperties',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Constructors',
    deprecated: true,
    deprecationMessage: 'Deprecated by Project Lombok. Use `lombok.anyConstructor.addConstructorProperties = false` instead.',
    replacement: 'lombok.anyConstructor.addConstructorProperties = false',
    description: 'Deprecated. If `true`, suppresses adding `@java.beans.ConstructorProperties`.'
  },
  {
    key: 'lombok.noArgsConstructor.extraPrivate',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Constructors',
    description: 'If `true`, Lombok generates a private no-args constructor if needed by frameworks (e.g. JPA / Hibernate).'
  },

  // --- EqualsAndHashCode & ToString ---
  {
    key: 'lombok.equalsAndHashCode.doNotUseGetters',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'EqualsAndHashCode',
    description: 'If `true`, Lombok uses direct field access instead of calling getters inside `equals` and `hashCode` implementations.'
  },
  {
    key: 'lombok.equalsAndHashCode.callSuper',
    type: 'enum',
    allowedValues: ['call', 'ignore', 'warn'],
    defaultValue: 'warn',
    category: 'EqualsAndHashCode',
    description: 'Determines how `equals` and `hashCode` call the superclass method when extending a non-Object class: `call`, `ignore`, or `warn`.'
  },
  {
    key: 'lombok.toString.doNotUseGetters',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'ToString',
    description: 'If `true`, Lombok uses direct field access instead of calling getters inside `toString` implementations.'
  },
  {
    key: 'lombok.toString.callSuper',
    type: 'enum',
    allowedValues: ['call', 'ignore', 'warn'],
    defaultValue: 'warn',
    category: 'ToString',
    description: 'Determines whether `toString` calls superclass `toString` if the class extends a non-Object class: `call`, `ignore`, or `warn`.'
  },
  {
    key: 'lombok.toString.includeFieldNames',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'true',
    category: 'ToString',
    description: 'Whether field names are included in generated `toString` representations.'
  },
  {
    key: 'lombok.toString.onlyExplicitlyIncluded',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'ToString',
    description: 'If `true`, only fields and methods explicitly marked with `@ToString.Include` will be included in `toString`.'
  },

  // --- Builders ---
  {
    key: 'lombok.builder.className',
    type: 'string',
    defaultValue: '*Builder',
    category: 'Builder',
    description: 'Pattern for generated builder class names. The asterisk `*` is replaced with the annotated class name (default: `*Builder`).'
  },
  {
    key: 'lombok.superBuilder.className',
    type: 'string',
    defaultValue: '*Builder',
    category: 'Builder',
    description: 'Pattern for generated SuperBuilder class names.'
  },
  {
    key: 'lombok.singular.useGuava',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Builder',
    description: 'If `true`, Lombok uses Guava Immutable collections for `@Singular` fields instead of `java.util.Collections.unmodifiable*`.'
  },
  {
    key: 'lombok.singular.auto',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'true',
    category: 'Builder',
    description: 'If `true`, Lombok automatically discovers singular forms of plural collection field names.'
  },

  // --- Field Defaults ---
  {
    key: 'lombok.fieldDefaults.defaultPrivate',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'FieldDefaults',
    description: 'If `true`, fields without explicit access modifiers will default to `private`.'
  },
  {
    key: 'lombok.fieldDefaults.defaultFinal',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'FieldDefaults',
    description: 'If `true`, fields without explicit `final` modifiers will default to `final`.'
  },

  // --- FieldNameConstants ---
  {
    key: 'lombok.fieldNameConstants.prefix',
    type: 'string',
    category: 'FieldNameConstants',
    description: 'Prefix to prepend to generated field name constants.'
  },
  {
    key: 'lombok.fieldNameConstants.suffix',
    type: 'string',
    category: 'FieldNameConstants',
    description: 'Suffix to append to generated field name constants.'
  },
  {
    key: 'lombok.fieldNameConstants.uppercase',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'FieldNameConstants',
    description: 'If `true`, generated field name constants will be uppercase snake_case.'
  },
  {
    key: 'lombok.fieldNameConstants.asEnum',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'FieldNameConstants',
    description: 'If `true`, Lombok generates an `enum` instead of a static inner class of constants.'
  },

  // --- Logging ---
  {
    key: 'lombok.log.fieldName',
    type: 'identifier',
    defaultValue: 'log',
    category: 'Logging',
    description: 'The name of the generated logger field (e.g. `log` or `LOGGER`).'
  },
  {
    key: 'lombok.log.fieldIsStatic',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'true',
    category: 'Logging',
    description: 'Whether the generated logger field should be static.'
  },
  {
    key: 'lombok.log.custom.declaration',
    type: 'string',
    category: 'Logging',
    description: 'Declaration definition for `@CustomLog` (e.g. `my.pkg.CustomLogger my.pkg.LoggerFactory.getLogger(TYPE)`).'
  },

  // --- NonNull ---
  {
    key: 'lombok.nonNull.exceptionType',
    type: 'enum',
    allowedValues: [
      'IllegalArgumentException',
      'NullPointerException',
      'Assertion',
      'JDK',
      'Guava'
    ],
    defaultValue: 'NullPointerException',
    category: 'NonNull',
    description: 'Exception type thrown when a `@NonNull` parameter is null.'
  },

  // --- Copyable Annotations ---
  {
    key: 'lombok.copyableAnnotations',
    type: 'list',
    category: 'Annotations',
    description: 'List of annotations copied from fields onto generated getters, setters, withers, and constructors. Supports `+=`, `-=`, and `clear`.'
  },

  // --- Jackson ---
  {
    key: 'lombok.jackson.jsonProperty',
    type: 'enum',
    allowedValues: ['generate', 'ignore'],
    defaultValue: 'ignore',
    category: 'Jackson',
    description: 'Whether to automatically copy `@JsonProperty` to generated builder setter methods.'
  },

  // --- FindBugs ---
  {
    key: 'lombok.extern.findbugs.addSuppressFBWarnings',
    type: 'boolean',
    allowedValues: ['true', 'false'],
    defaultValue: 'false',
    category: 'Code Quality',
    description: 'When `true`, Lombok adds `@edu.umd.cs.findbugs.annotations.SuppressFBWarnings` to generated code.'
  }
];

// List of Lombok features supporting `.flagUsage`
const FLAG_USAGE_TARGETS = [
  'accessors',
  'allArgsConstructor',
  'noArgsConstructor',
  'requiredArgsConstructor',
  'cleanup',
  'data',
  'delegate',
  'equalsAndHashCode',
  'experimental',
  'extensionMethod',
  'fieldDefaults',
  'fieldNameConstants',
  'getter',
  'setter',
  'helper',
  'log',
  'log.apacheCommons',
  'log.javaUtilLogging',
  'log.jbosslog',
  'log.log4j',
  'log.log4j2',
  'log.slf4j',
  'log.xslf4j',
  'log.flogger',
  'log.custom',
  'nonNull',
  'sneakyThrows',
  'standardException',
  'synchronized',
  'toString',
  'val',
  'var',
  'value',
  'wither',
  'with',
  'builder',
  'superBuilder',
  'utilityClass'
] as const;

export const FLAG_USAGE_VALUES = ['warning', 'error', 'allow'] as const;

// Generate flagUsage properties for all Lombok annotations/features
const FLAG_USAGE_PROPERTIES: LombokPropertyDef[] = FLAG_USAGE_TARGETS.map(target => ({
  key: `lombok.${target}.flagUsage`,
  type: 'enum',
  allowedValues: FLAG_USAGE_VALUES,
  defaultValue: 'allow',
  category: 'Flag Usage',
  description: `Configures compiler diagnostic level when using \`@${target}\`: \`allow\` (permitted), \`warning\` (emits compiler warning), or \`error\` (compilation fails).`
}));

/**
 * All known Lombok configuration properties combined.
 */
export const ALL_LOMBOK_PROPERTIES: readonly LombokPropertyDef[] = [
  ...LOMBOK_PROPERTIES,
  ...FLAG_USAGE_PROPERTIES
];

/**
 * Map index for O(1) property lookup by key name.
 */
export const PROPERTY_MAP: ReadonlyMap<string, LombokPropertyDef> = new Map(
  ALL_LOMBOK_PROPERTIES.map(p => [p.key.toLowerCase(), p])
);

/**
 * Looks up a property definition ignoring case.
 */
export function findProperty(key: string): LombokPropertyDef | undefined {
  return PROPERTY_MAP.get(key.trim().toLowerCase());
}
