# Lombok Sense

Language support for Project Lombok configuration files (`lombok.config`) in Visual Studio Code.

## Features

- **Syntax Highlighting**: Dedicated grammar for `lombok.config` properties, directives (`clear`), assignment operators (`=`, `+=`, `-=`), values, and comments.
- **Autocompletion**:
  - **Keys**: Full coverage of official Lombok configuration properties and `.flagUsage` settings.
  - **Values**: Contextual completion for booleans, strategy enums (`callSuper`, `flagUsage`), and loggers.
  - **Workspace Annotation Resolution**: Scans workspace Java files (`@interface` declarations and imports) and common framework libraries to autocomplete copyable annotations (e.g. `org.springframework.beans.factory.annotation.Qualifier`, `com.fasterxml.jackson.annotation.JsonProperty`, custom annotations).
  - **Directives**: Suggests list properties when using the `clear` keyword.
- **Hover Documentation**: In-editor documentation cards showing official descriptions, categories, types, default values, and deprecation details.
- **Diagnostics & Linting**:
  - Unknown keys detection with Levenshtein-based typo suggestions.
  - Value validation against expected types and permitted enum choices.
  - Operator validation (`+=` and `-=` restricted to list properties).
  - Deprecated properties warnings with modern replacements.
- **Quick Fixes**: One-click actions to correct typos, fix operator misuse, and upgrade deprecated properties.
- **Document Formatting**: Normalizes whitespace around operators, standardizes directives, and cleans comments.

## Configuration

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `lombokSense.lint.unknownKeys` | `string` | `"warning"` | Severity for unknown configuration keys (`warning`, `error`, `ignore`). |
| `lombokSense.lint.deprecatedKeys` | `string` | `"warning"` | Severity for deprecated configuration keys. |
| `lombokSense.lint.invalidValues` | `string` | `"error"` | Severity for invalid or unallowed property values. |
| `lombokSense.lint.invalidOperators` | `string` | `"error"` | Severity when using `+=` or `-=` on scalar properties. |
| `lombokSense.format.spaceAroundOperator` | `boolean` | `true` | Enforces a single space around operators (`=`, `+=`, `-=`). |

## Supported Properties

Lombok Sense maintains a typed schema of the Lombok configuration specification:

- Accessors (`chain`, `fluent`, `prefix`, `capitalization`, `makeFinal`)
- Builders (`className`, `singular.auto`, `singular.useGuava`)
- Field Defaults (`defaultPrivate`, `defaultFinal`)
- Class generation (`equalsAndHashCode.callSuper`, `toString.callSuper`, `includeFieldNames`)
- Logging (`fieldName`, `fieldIsStatic`, `custom.declaration`)
- Copyable annotations (`copyableAnnotations`, `accessors.prefix`)
- Directives (`config.stopBubbling`, `clear <property>`)
- Governance flags across all Lombok annotations (`lombok.<feature>.flagUsage`)

## Development

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Build production bundle
npm run build-prod
```

## License

MIT © Houssam OUATMANI
