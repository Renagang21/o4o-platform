// Shortcode types to avoid circular dependencies

export enum ExecutionContext {
  POST = 'post',
  PAGE = 'page',
  WIDGET = 'widget',
  EMAIL = 'email',
  PREVIEW = 'preview'
}

export interface ShortcodeParseOptions {
  context?: ExecutionContext;
  contextId?: string;
  userId?: string;
  enableCache?: boolean;
  maxExecutionTime?: number; // in milliseconds
  maxNestingLevel?: number;
}

export interface ParsedShortcode {
  name: string;
  attributes: Record<string, any>;
  content: string;
  raw: string;
  isSelfClosing: boolean;
}