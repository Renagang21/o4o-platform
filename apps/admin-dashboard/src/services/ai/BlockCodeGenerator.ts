/**
 * Block Code Generator
 * Phase 2-A: AI-powered block code generation
 *
 * This service generates React block components from specifications
 * using AI (Gemini/GPT/Claude).
 */

import { authClient } from '@o4o/auth-client';
import { NewBlockRequest } from './types';

/**
 * Generated block code result
 */
export interface GeneratedBlockCode {
  componentCode: string;
  definitionCode: string;
  componentName: string;
  blockName: string; // o4o/component-name
}

/**
 * Generation options
 */
export interface GenerateOptions {
  provider?: 'gemini' | 'openai' | 'claude';
  model?: string;
  timeout?: number;
}

/**
 * Block Code Generator Service
 */
class BlockCodeGenerator {
  /**
   * Generate component and definition code from spec
   */
  async generate(
    spec: NewBlockRequest,
    options: GenerateOptions = {}
  ): Promise<GeneratedBlockCode> {
    const {
      provider = 'gemini',
      model = 'gemini-2.5-flash',
      timeout = 60000,
    } = options;

    try {
      console.log('🤖 Generating block code for:', spec.componentName);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Build user prompt
      const userPrompt = this.buildUserPrompt(spec);

      // Call AI via server proxy
      const response = await authClient.api.post('/ai/generate', {
        provider,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.3, // Lower temperature for code generation
        maxTokens: 4096,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'AI generation failed');
      }

      // Parse AI response
      const result = this.parseAIResponse(data.result.blocks, spec);

      console.log('✅ Block code generated successfully:', result.componentName);

      return result;
    } catch (error: any) {
      console.error('❌ Block code generation failed:', error);

      // Return fallback code on error
      return this.getFallbackCode(spec);
    }
  }

  /**
   * Build system prompt for code generation
   */
  private buildSystemPrompt(): string {
    return `You are an expert React TypeScript developer specialized in creating reusable UI components for the O4O Platform.

**Your Task:**
Generate a complete React component and its block definition based on the provided specification.

**Critical Rules:**
1. Output ONLY a valid JSON object with this exact structure:
{
  "component": "// Full TypeScript React component code",
  "definition": "// Full BlockDefinition code"
}

2. Component Requirements:
   - Use TypeScript with proper prop types
   - Use React.FC<PropsType> pattern
   - Use functional components with hooks
   - Include proper TypeScript interfaces
   - Use Tailwind CSS for styling
   - Make it responsive and accessible
   - Add helpful comments

3. Definition Requirements:
   - Follow O4O BlockDefinition structure
   - Block name must start with "o4o/"
   - Include all attributes from spec
   - Set proper category
   - Include description

4. Code Quality:
   - Production-ready code
   - No placeholder comments like "// Add your code here"
   - No external dependencies (only React)
   - No import statements (they will be injected)
   - Clean, readable, well-structured

5. Absolutely NO:
   - Markdown code blocks
   - Natural language explanations
   - Multiple components in one file
   - External API calls
   - localStorage/sessionStorage access
   - eval or Function constructor

**Example Output:**
{
  "component": "interface TimelineItemProps {\\n  title: string;\\n  date: string;\\n  description: string;\\n}\\n\\ninterface TimelineChartProps {\\n  items: TimelineItemProps[];\\n  orientation?: 'vertical' | 'horizontal';\\n}\\n\\nconst TimelineChart: React.FC<TimelineChartProps> = ({ items, orientation = 'vertical' }) => {\\n  return (\\n    <div className=\\"timeline-chart\\">\\n      {items.map((item, index) => (\\n        <div key={index} className=\\"timeline-item\\">\\n          <h3>{item.title}</h3>\\n          <p>{item.date}</p>\\n          <p>{item.description}</p>\\n        </div>\\n      ))}\\n    </div>\\n  );\\n};",
  "definition": "export const TimelineChartDefinition: BlockDefinition = {\\n  name: 'o4o/timeline-chart',\\n  title: 'Timeline Chart',\\n  category: 'widgets',\\n  description: 'Display events in a chronological timeline',\\n  component: TimelineChart,\\n  attributes: {\\n    items: { type: 'array', default: [] },\\n    orientation: { type: 'string', default: 'vertical' }\\n  }\\n};"
}`;
  }

  /**
   * Build user prompt with spec details
   */
  private buildUserPrompt(spec: NewBlockRequest): string {
    return `Generate a React component with the following specification:

Component Name: ${spec.componentName}
Purpose: ${spec.reason}
Props: ${spec.spec.props?.join(', ') || 'none'}
Style: ${spec.spec.style || 'default'}
Category: ${spec.spec.category || 'widgets'}

Requirements:
1. Create a TypeScript React component named "${spec.componentName}"
2. Implement props: ${spec.spec.props?.map(p => `${p}: any`).join(', ') || 'none'}
3. Style according to: ${spec.spec.style || 'modern, clean design'}
4. Make it visually appealing with Tailwind CSS
5. Add proper TypeScript types
6. Create corresponding BlockDefinition with name "o4o/${this.toKebabCase(spec.componentName)}"

Output the JSON with "component" and "definition" keys.`;
  }

  /**
   * Parse AI response and extract component/definition code
   */
  private parseAIResponse(
    aiResult: any,
    spec: NewBlockRequest
  ): GeneratedBlockCode {
    try {
      // AI should return an object or array with component and definition
      let componentCode: string;
      let definitionCode: string;

      // Handle different AI response formats
      if (typeof aiResult === 'string') {
        // If it's a string, try to parse as JSON
        const parsed = JSON.parse(aiResult);
        componentCode = parsed.component;
        definitionCode = parsed.definition;
      } else if (Array.isArray(aiResult) && aiResult.length > 0) {
        // If it's an array, take the first element
        componentCode = aiResult[0].component || aiResult[0].attributes?.component;
        definitionCode = aiResult[0].definition || aiResult[0].attributes?.definition;
      } else if (aiResult.component && aiResult.definition) {
        // Direct object
        componentCode = aiResult.component;
        definitionCode = aiResult.definition;
      } else {
        throw new Error('Invalid AI response format');
      }

      // Validate we got both pieces
      if (!componentCode || !definitionCode) {
        throw new Error('Missing component or definition code');
      }

      // Clean up code (remove markdown code blocks if AI added them)
      componentCode = this.cleanCode(componentCode);
      definitionCode = this.cleanCode(definitionCode);

      const componentName = spec.componentName;
      const blockName = `o4o/${this.toKebabCase(componentName)}`;

      return {
        componentCode,
        definitionCode,
        componentName,
        blockName,
      };
    } catch (error: any) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Clean code by removing markdown code blocks
   */
  private cleanCode(code: string): string {
    // Remove markdown code blocks
    code = code.replace(/```(?:typescript|tsx|javascript|jsx)?\n?/g, '');
    code = code.replace(/```\n?/g, '');

    // Trim whitespace
    code = code.trim();

    return code;
  }

  /**
   * Get fallback code when AI generation fails
   */
  private getFallbackCode(spec: NewBlockRequest): GeneratedBlockCode {
    const componentName = spec.componentName;
    const blockName = `o4o/${this.toKebabCase(componentName)}`;
    const props = spec.spec.props || [];

    // Generate props interface
    const propsInterface = props.length > 0
      ? `interface ${componentName}Props {\n${props.map(p => `  ${p}?: any;`).join('\n')}\n}\n\n`
      : '';

    const propsType = props.length > 0 ? `${componentName}Props` : 'any';
    const propsParam = props.length > 0 ? `{ ${props.join(', ')} }` : 'props';

    const componentCode = `${propsInterface}const ${componentName}: React.FC<${propsType}> = (${propsParam}) => {
  return (
    <div className="border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
          AI
        </div>
        <h3 className="text-lg font-semibold text-blue-900">
          ${componentName} (Auto-Generated)
        </h3>
      </div>

      <div className="text-sm text-blue-700 mb-3">
        <strong>Purpose:</strong> ${spec.reason}
      </div>

      ${props.length > 0 ? `<div className="text-xs text-blue-600 bg-white p-3 rounded border border-blue-200">
        <strong>Props:</strong>
        <pre className="mt-2 overflow-auto">
          {JSON.stringify({ ${props.join(', ')} }, null, 2)}
        </pre>
      </div>` : ''}

      <div className="mt-4 text-xs text-blue-500 italic">
        This is a fallback component. Customize it to fit your needs.
      </div>
    </div>
  );
};`;

    const definitionCode = `export const ${componentName}Definition = {
  name: '${blockName}',
  title: '${componentName}',
  category: '${spec.spec.category || 'widgets'}',
  description: '${spec.reason}',
  component: ${componentName},
  attributes: {
${props.map(p => `    ${p}: { type: 'string', default: '' }`).join(',\n')}
  }
};`;

    return {
      componentCode,
      definitionCode,
      componentName,
      blockName,
    };
  }

  /**
   * Convert PascalCase to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])([a-z])/g, '$1-$2$3')
      .toLowerCase();
  }
}

// Singleton instance
export const blockCodeGenerator = new BlockCodeGenerator();
