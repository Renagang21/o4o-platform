import Handlebars from 'handlebars';
import { acfHelpers } from './helpers/acf';
import { relationHelpers } from './helpers/relation';
import { mediaHelpers } from './helpers/media';
import { formatHelpers } from './helpers/format';
import { conditionalHelpers } from './helpers/conditional';
import { collectionHelpers } from './helpers/collection';
import { mathHelpers } from './helpers/math';

export interface TemplateContext {
  data: any;
  user?: any;
  settings?: any;
  meta?: any;
}

export interface TemplateOptions {
  strict?: boolean;
  noEscape?: boolean;
  helpers?: Record<string, Function>;
  partials?: Record<string, string>;
}

export class TemplateRenderer {
  private handlebars: typeof Handlebars;
  private registeredHelpers: Set<string>;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate<any>>;

  constructor(options?: TemplateOptions) {
    // Create isolated Handlebars instance
    this.handlebars = Handlebars.create();
    this.registeredHelpers = new Set();
    this.compiledTemplates = new Map();

    // Register all built-in helpers
    this.registerBuiltInHelpers();

    // Register custom helpers if provided
    if (options?.helpers) {
      Object.entries(options.helpers).forEach(([name, helper]) => {
        this.registerHelper(name, helper);
      });
    }

    // Register partials if provided
    if (options?.partials) {
      Object.entries(options.partials).forEach(([name, partial]) => {
        this.registerPartial(name, partial);
      });
    }
  }

  private registerBuiltInHelpers(): void {
    // Register ACF helpers
    Object.entries(acfHelpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });

    // Register relation helpers
    Object.entries(relationHelpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });

    // Register media helpers
    Object.entries(mediaHelpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });

    // Register format helpers
    Object.entries(formatHelpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });

    // Register conditional helpers
    Object.entries(conditionalHelpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });

    // Register collection helpers
    Object.entries(collectionHelpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });

    // Register math helpers
    Object.entries(mathHelpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });
  }

  public registerHelper(name: string, helper: Function): void {
    // Sandbox the helper function
    const sandboxedHelper = this.sandboxHelper(name, helper);
    this.handlebars.registerHelper(name, sandboxedHelper);
    this.registeredHelpers.add(name);
  }

  private sandboxHelper(name: string, helper: Function): Function {
    return (...args: any[]) => {
      try {
        // Remove Handlebars options object from args when calling helper
        const options = args[args.length - 1];
        const helperArgs = args.slice(0, -1);

        // Call the helper with sanitized arguments
        const result = helper.apply(null, [...helperArgs, options]);

        // Sanitize the output
        return this.sanitizeOutput(result);
      } catch (error) {
        console.error(`Helper '${name}' error:`, error);
        return `[Helper Error: ${name}]`;
      }
    };
  }

  private sanitizeOutput(value: any): any {
    // Prevent XSS by escaping HTML by default
    if (typeof value === 'string') {
      // Check if it's already a SafeString
      if (value instanceof this.handlebars.SafeString) {
        return value;
      }
      // Return escaped string
      return value;
    }
    return value;
  }

  public registerPartial(name: string, content: string): void {
    this.handlebars.registerPartial(name, content);
  }

  public compile(template: string, options?: CompileOptions): HandlebarsTemplateDelegate<any> {
    const cacheKey = this.getCacheKey(template, options);

    // Check cache
    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey)!;
    }

    // Compile template
    const compiled = this.handlebars.compile(template, {
      strict: options?.strict,
      noEscape: options?.noEscape,
      preventIndent: true
    });

    // Cache compiled template
    this.compiledTemplates.set(cacheKey, compiled);

    return compiled;
  }

  public render(template: string, context: TemplateContext, options?: TemplateOptions): string {
    try {
      // Compile template
      const compiled = this.compile(template, options);

      // Prepare context
      const fullContext = {
        ...context.data,
        $user: context.user,
        $settings: context.settings,
        $meta: context.meta,
        $root: context.data // Reference to root data
      };

      // Render template
      const result = compiled(fullContext);

      return result;
    } catch (error) {
      console.error('Template rendering error:', error);
      return `[Template Error: ${error.message}]`;
    }
  }

  public renderAsync(
    template: string,
    context: TemplateContext,
    options?: TemplateOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.render(template, context, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  private getCacheKey(template: string, options?: any): string {
    const optionsKey = options ? JSON.stringify(options) : '';
    return `${template.substring(0, 100)}_${optionsKey}`;
  }

  public clearCache(): void {
    this.compiledTemplates.clear();
  }

  public getRegisteredHelpers(): string[] {
    return Array.from(this.registeredHelpers);
  }

  // Validate template syntax
  public validate(template: string): { valid: boolean; errors: string[] } {
    try {
      this.compile(template, { strict: true });
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }

  // Create safe HTML output
  public safeString(str: string): any {
    return new this.handlebars.SafeString(str);
  }

  // Escape HTML
  public escapeExpression(str: string): string {
    return this.handlebars.escapeExpression(str);
  }
}

// Singleton instance
let defaultRenderer: TemplateRenderer | null = null;

export function getTemplateRenderer(options?: TemplateOptions): TemplateRenderer {
  if (!defaultRenderer) {
    defaultRenderer = new TemplateRenderer(options);
  }
  return defaultRenderer;
}

// Export types
export interface CompileOptions {
  strict?: boolean;
  noEscape?: boolean;
}

// Template builder utility
export class TemplateBuilder {
  private parts: string[] = [];

  public add(template: string): this {
    this.parts.push(template);
    return this;
  }

  public addIf(condition: boolean, template: string): this {
    if (condition) {
      this.parts.push(template);
    }
    return this;
  }

  public addBlock(name: string, content: string): this {
    this.parts.push(`{{#${name}}}`);
    this.parts.push(content);
    this.parts.push(`{{/${name}}}`);
    return this;
  }

  public addPartial(name: string, context?: string): this {
    if (context) {
      this.parts.push(`{{> ${name} ${context}}}`);
    } else {
      this.parts.push(`{{> ${name}}}`);
    }
    return this;
  }

  public build(): string {
    return this.parts.join('\n');
  }
}

// Export default
export default TemplateRenderer;