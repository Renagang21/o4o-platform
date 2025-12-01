import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { parseTailwindClasses } from './tailwindParser';
import { O4OClient } from '../api/o4oClient';
import { AuthManager } from '../auth/authManager';

export async function convertAndSavePage(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const selection = editor.selection;
    const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);

    if (!text) {
        vscode.window.showErrorMessage('No text selected or file is empty');
        return;
    }

    try {
        const blocks = parseReactToBlocks(text);

        if (blocks.length === 0) {
            vscode.window.showWarningMessage('No blocks generated from code. Is it valid React JSX?');
            return;
        }

        const title = await vscode.window.showInputBox({ prompt: 'Enter Page Title' });
        if (!title) return;

        const slug = await vscode.window.showInputBox({ prompt: 'Enter Page Slug', value: title.toLowerCase().replace(/\s+/g, '-') });
        if (!slug) return;

        const authManager = new AuthManager(context);
        const token = await authManager.getToken();

        if (!token) {
            vscode.window.showErrorMessage('Not logged in. Please run "O4O: Login and Authenticate" first.');
            return;
        }

        const client = new O4OClient('https://api.neture.co.kr/api/v1'); // Should be config
        await client.createPage({ title, slug, content: blocks }, token);

        vscode.window.showInformationMessage(`Page "${title}" created successfully!`);

    } catch (error: any) {
        vscode.window.showErrorMessage('Conversion failed: ' + error.message);
    }
}

export function parseReactToBlocks(code: string): any[] {
    const blocks: any[] = [];

    // Simple Regex-based parser for MVP to bypass build issues with heavy AST parsers
    // Matches: <TagName attributes...>content</TagName> or <TagName attributes... />
    // This is NOT robust but sufficient for the requested bypass.

    const tagRegex = /<(\w+)([^>]*)>(.*?)<\/\1>|<(\w+)([^>]*)\/>/gs;
    let match;

    while ((match = tagRegex.exec(code)) !== null) {
        const fullMatch = match[0];
        const tagName = match[1] || match[4];
        const attributesString = match[2] || match[5] || '';
        const content = match[3] || '';

        const block = mapElementToBlock(tagName, attributesString, content, fullMatch);
        if (block) blocks.push(block);
    }

    // If no blocks found via regex, treat the whole thing as a placeholder
    if (blocks.length === 0 && code.trim().length > 0) {
        blocks.push(createPlaceholderBlock(code, 'Failed to parse with regex'));
    }

    return blocks;
}

function mapElementToBlock(tagName: string, attributesString: string, content: string, fullCode: string): any {
    const attributes = parseAttributes(attributesString);
    const tailwindClasses = attributes.className ? parseTailwindClasses(attributes.className) : {};

    const block: any = {
        id: uuidv4(),
        attributes: { ...tailwindClasses }
    };

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        block.type = 'o4o/heading';
        block.attributes.level = parseInt(tagName.replace('h', ''));
        block.attributes.content = cleanContent(content);
    } else if (tagName === 'p') {
        block.type = 'o4o/paragraph';
        block.attributes.content = cleanContent(content);
    } else if (tagName === 'img') {
        block.type = 'o4o/image';
        block.attributes.url = attributes.src;
        block.attributes.alt = attributes.alt;
    } else if (tagName === 'div' || tagName === 'section') {
        if (attributes.className?.includes('grid')) {
            block.type = 'o4o/columns';
            // Inner blocks parsing would require recursive regex, which is hard.
            // For MVP bypass, we'll just treat it as a group or placeholder if complex.
            block.innerBlocks = []; // Placeholder for inner blocks
        } else {
            block.type = 'o4o/group';
            block.innerBlocks = [];
        }
    } else if (tagName === 'button') {
        block.type = 'o4o/button';
        block.attributes.text = cleanContent(content);
    } else {
        // Unknown tag -> Placeholder (as requested)
        return createPlaceholderBlock(fullCode, `Unknown tag: ${tagName}`);
    }

    return block;
}

function createPlaceholderBlock(code: string, note: string): any {
    return {
        type: 'o4o/placeholder',
        attributes: {
            notes: `[Auto-generated] ${note}\n\nOriginal Code:\n${code}`
        }
    };
}

function parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    let match;
    while ((match = attrRegex.exec(attrString)) !== null) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

function cleanContent(content: string): string {
    // Remove nested tags for text content (simplified)
    return content.replace(/<[^>]*>/g, '').trim();
}
