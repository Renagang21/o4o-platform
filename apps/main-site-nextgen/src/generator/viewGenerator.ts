/**
 * ViewGenerator
 * Automatic View Schema Generator for NextGen Frontend
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { analyzeInput, extractParams } from './analyzer';
import { selectLayout } from './rules/layoutRules';
import { selectFunctionComponents } from './rules/componentRules';
import { generateFetchConfig } from './rules/fetchRules';
import { ViewSchema } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a View Schema from input and saves it to /views directory
 * @param input - URL, command, or natural language input
 * @returns Path to the generated JSON file
 */
export async function generateView(input: string): Promise<string> {
  // Step 1: Analyze input
  const intent = analyzeInput(input);
  console.log('📊 Analyzed Intent:', intent);

  // Step 2: Select layout
  const layout = selectLayout(intent);
  console.log('🎨 Selected Layout:', layout);

  // Step 3: Select components
  const components = selectFunctionComponents(intent);
  console.log('🧩 Selected Components:', components);

  // Step 4: Generate fetch config
  const fetchConf = generateFetchConfig(intent.viewId);
  if (fetchConf) {
    console.log('🔌 Generated Fetch Config:', fetchConf);
  }

  // Step 5: Extract params if any
  const params = extractParams(input);
  if (Object.keys(params).length > 0) {
    console.log('🔑 Extracted Params:', params);
  }

  // Step 6: Assemble View Schema
  const view: ViewSchema = {
    viewId: intent.viewId,
    meta: {
      title: intent.viewId
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      description: `Auto-generated view for ${intent.viewId}`,
    },
    layout: {
      type: layout,
    },
    components: components.map((type) => ({
      type,
      props: fetchConf ? { fetch: fetchConf } : {},
    })),
  };

  // Step 7: Determine file path
  const viewsDir = path.resolve(__dirname, '../views');
  if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir, { recursive: true });
  }

  const filePath = path.join(viewsDir, `${intent.viewId}.json`);

  // Step 8: Write to file
  fs.writeFileSync(filePath, JSON.stringify(view, null, 2), 'utf-8');
  console.log('✅ View saved to:', filePath);

  return filePath;
}

/**
 * Generates multiple views from an array of inputs
 * @param inputs - Array of inputs
 * @returns Array of file paths
 */
export async function generateViews(inputs: string[]): Promise<string[]> {
  const paths: string[] = [];

  for (const input of inputs) {
    console.log(`\n🚀 Generating view for: "${input}"`);
    const filePath = await generateView(input);
    paths.push(filePath);
  }

  console.log(`\n✨ Generated ${paths.length} views total`);
  return paths;
}

/**
 * Lists all generated views
 * @returns Array of view IDs
 */
export function listGeneratedViews(): string[] {
  const viewsDir = path.resolve(__dirname, '../views');

  if (!fs.existsSync(viewsDir)) {
    return [];
  }

  const files = fs.readdirSync(viewsDir);
  return files
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''));
}

/**
 * Loads a generated view by ID
 * @param viewId - View ID to load
 * @returns ViewSchema or null
 */
export function loadView(viewId: string): ViewSchema | null {
  const viewsDir = path.resolve(__dirname, '../views');
  const filePath = path.join(viewsDir, `${viewId}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ViewSchema;
}

/**
 * Deletes a generated view
 * @param viewId - View ID to delete
 * @returns boolean
 */
export function deleteView(viewId: string): boolean {
  const viewsDir = path.resolve(__dirname, '../views');
  const filePath = path.join(viewsDir, `${viewId}.json`);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  console.log(`🗑️  Deleted view: ${viewId}`);
  return true;
}
