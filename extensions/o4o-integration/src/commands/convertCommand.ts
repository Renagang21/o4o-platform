import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';
import { PageClient } from '../api/pageClient';
import { parseReactCode } from '../converter/reactParser';
import { convertReactToBlocks } from '../converter/blockMapper';
import { PageCreateRequest } from '../api/types';

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50); // Limit slug length
}

/**
 * O4O: Convert & Save Page Command
 * Converts current JSX file to O4O blocks and creates a page
 */
export async function convertAndSaveCommand(
  authManager: AuthManager,
  pageClient: PageClient
): Promise<void> {
  try {
    // Check authentication
    const isAuth = await authManager.isAuthenticated();
    if (!isAuth) {
      const login = await vscode.window.showWarningMessage(
        'You are not logged in. Please login first.',
        'Login Now'
      );

      if (login === 'Login Now') {
        await vscode.commands.executeCommand('o4o.login');
      }
      return;
    }

    // Get active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor. Please open a JSX/TSX file.');
      return;
    }

    // Get document content
    const document = editor.document;
    const jsxCode = document.getText();

    if (!jsxCode.trim()) {
      vscode.window.showErrorMessage('File is empty. Please add some JSX code.');
      return;
    }

    // Prompt for page title
    const pageTitle = await vscode.window.showInputBox({
      prompt: 'Enter page title',
      placeHolder: 'My AI Generated Page',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Page title is required';
        }
        return null;
      },
    });

    if (!pageTitle) {
      vscode.window.showInformationMessage('Page creation cancelled');
      return;
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Converting and saving page...',
        cancellable: false,
      },
      async (progress) => {
        try {
          // Step 1: Parse React code
          progress.report({ message: 'Parsing JSX code...' });
          const reactElements = parseReactCode(jsxCode);

          if (reactElements.length === 0) {
            throw new Error('No JSX elements found in the file. Please check your code.');
          }

          // Step 2: Convert to blocks
          progress.report({ message: 'Converting to O4O blocks...' });
          const blocks = convertReactToBlocks(reactElements);

          // Count placeholder blocks
          const placeholderCount = blocks.filter((b) => b.type === 'o4o/placeholder').length;

          // Step 3: Create page data
          progress.report({ message: 'Creating page...' });
          const pageData: PageCreateRequest = {
            title: pageTitle,
            slug: generateSlug(pageTitle),
            content: blocks,
            excerpt: `AI-generated page with ${blocks.length} blocks`,
            status: 'draft',
            type: 'page',
            showInMenu: false,
            seo: {
              metaTitle: pageTitle,
              metaDescription: `AI-generated page: ${pageTitle}`,
            },
          };

          // Step 4: Call API
          progress.report({ message: 'Saving to O4O Platform...' });
          const response = await pageClient.createPage(pageData);

          // Step 5: Show success message
          const pageUrl = `https://admin.neture.co.kr/pages/${response.data.id}`;
          const message = placeholderCount > 0
            ? `✅ Page created successfully!\n⚠️ ${placeholderCount} custom components were saved as placeholders (manual review needed).`
            : `✅ Page created successfully!`;

          const action = await vscode.window.showInformationMessage(
            message,
            'Open in Browser'
          );

          if (action === 'Open in Browser') {
            vscode.env.openExternal(vscode.Uri.parse(pageUrl));
          }
        } catch (conversionError) {
          throw conversionError;
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to convert and save page: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
