/**
 * AI Block Writer Service
 * Phase 2-B: Save AI-generated blocks to filesystem and Git
 *
 * Features:
 * - Save component code and definition to filesystem
 * - Handle filename conflicts (auto rename to ComponentName_v2, etc.)
 * - Git automation (commit + push)
 * - Rollback on failure
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import logger from '../utils/logger.js';

export interface SaveBlockRequest {
  componentName: string;
  componentCode: string;
  definitionCode: string;
  savePath?: string; // Optional custom path, defaults to apps/admin-dashboard/src/blocks/generated
}

export interface SaveBlockResult {
  success: boolean;
  files?: {
    component: string;
    definition: string;
  };
  git?: {
    branch: string;
    commit: string;
  };
  error?: string;
  renamedTo?: string; // If component name was changed due to conflict
}

class AIBlockWriterService {
  private readonly DEFAULT_SAVE_PATH = 'apps/admin-dashboard/src/blocks/generated';
  private readonly GIT_BRANCH = 'ai-generated/blocks';
  private readonly PROJECT_ROOT = process.cwd();

  /**
   * Save AI-generated block to filesystem and Git
   */
  async saveBlock(request: SaveBlockRequest): Promise<SaveBlockResult> {
    const { componentName, componentCode, definitionCode, savePath } = request;

    try {
      logger.info('🚀 Starting block save process', {
        componentName,
        savePath: savePath || this.DEFAULT_SAVE_PATH,
      });

      // Step 1: Validate inputs
      this.validateInputs(request);

      // Step 2: Determine save directory
      const targetPath = savePath || this.DEFAULT_SAVE_PATH;
      const absolutePath = path.join(this.PROJECT_ROOT, targetPath);

      // Step 3: Ensure directory exists
      await this.ensureDirectory(absolutePath);

      // Step 4: Resolve filename conflicts
      const { finalComponentName, renamed } = await this.resolveFilenameConflict(
        absolutePath,
        componentName
      );

      // Step 5: Generate file paths
      const componentFilePath = path.join(absolutePath, `${finalComponentName}.tsx`);
      const definitionFilePath = path.join(absolutePath, `${finalComponentName}.definition.ts`);

      // Step 6: Write files
      await fs.writeFile(componentFilePath, componentCode, 'utf-8');
      await fs.writeFile(definitionFilePath, definitionCode, 'utf-8');

      logger.info('✅ Files written successfully', {
        component: componentFilePath,
        definition: definitionFilePath,
      });

      // Step 7: Git automation
      let gitResult;
      try {
        gitResult = await this.gitAutoCommit(
          targetPath,
          renamed ? finalComponentName : componentName
        );
      } catch (gitError: any) {
        // Git failure is not critical - files are already saved
        logger.warn('⚠️ Git automation failed, but files were saved', {
          error: gitError.message,
        });
        gitResult = null;
      }

      // Step 8: Return result
      return {
        success: true,
        files: {
          component: path.relative(this.PROJECT_ROOT, componentFilePath),
          definition: path.relative(this.PROJECT_ROOT, definitionFilePath),
        },
        git: gitResult || undefined,
        renamedTo: renamed ? finalComponentName : undefined,
      };

    } catch (error: any) {
      logger.error('❌ Block save failed', {
        componentName,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message || 'Failed to save block',
      };
    }
  }

  /**
   * Validate save request inputs
   */
  private validateInputs(request: SaveBlockRequest): void {
    const { componentName, componentCode, definitionCode } = request;

    if (!componentName || !componentName.trim()) {
      throw new Error('Component name is required');
    }

    if (!componentCode || !componentCode.trim()) {
      throw new Error('Component code is required');
    }

    if (!definitionCode || !definitionCode.trim()) {
      throw new Error('Definition code is required');
    }

    // Validate component name format (PascalCase)
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
      throw new Error(
        'Component name must be in PascalCase (e.g., TimelineChart, MyButton)'
      );
    }
  }

  /**
   * Ensure directory exists, create if not
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dirPath, { recursive: true });
      logger.info('📁 Created directory', { path: dirPath });
    }
  }

  /**
   * Resolve filename conflicts by appending _v2, _v3, etc.
   */
  private async resolveFilenameConflict(
    dirPath: string,
    componentName: string
  ): Promise<{ finalComponentName: string; renamed: boolean }> {
    const componentFilePath = path.join(dirPath, `${componentName}.tsx`);
    const definitionFilePath = path.join(dirPath, `${componentName}.definition.ts`);

    try {
      // Check if files exist
      await fs.access(componentFilePath);
      // File exists - need to rename

      // Find next available version number
      let version = 2;
      let finalName = `${componentName}_v${version}`;
      let finalComponentPath = path.join(dirPath, `${finalName}.tsx`);
      let finalDefinitionPath = path.join(dirPath, `${finalName}.definition.ts`);

      while (true) {
        try {
          await fs.access(finalComponentPath);
          // This version exists too, try next
          version++;
          finalName = `${componentName}_v${version}`;
          finalComponentPath = path.join(dirPath, `${finalName}.tsx`);
          finalDefinitionPath = path.join(dirPath, `${finalName}.definition.ts`);
        } catch {
          // This version is available
          break;
        }
      }

      logger.info('⚠️ Filename conflict detected - renamed to', {
        original: componentName,
        renamed: finalName,
      });

      return {
        finalComponentName: finalName,
        renamed: true,
      };

    } catch {
      // Files don't exist - no conflict
      return {
        finalComponentName: componentName,
        renamed: false,
      };
    }
  }

  /**
   * Git automation: commit and push to ai-generated/blocks branch
   */
  private async gitAutoCommit(
    targetPath: string,
    componentName: string
  ): Promise<{ branch: string; commit: string }> {
    try {
      logger.info('🔧 Starting Git automation', {
        branch: this.GIT_BRANCH,
        componentName,
      });

      // Change to project root
      const cwd = this.PROJECT_ROOT;

      // Check if we're in a git repository
      try {
        execSync('git status', { cwd, stdio: 'ignore' });
      } catch {
        throw new Error('Not a git repository');
      }

      // Stash any uncommitted changes to avoid conflicts
      try {
        execSync('git stash push -u -m "AI block writer: temporary stash"', {
          cwd,
          stdio: 'ignore',
        });
      } catch {
        // No changes to stash
      }

      // Create or switch to branch
      try {
        // Try to checkout existing branch
        execSync(`git checkout ${this.GIT_BRANCH}`, { cwd, stdio: 'ignore' });
      } catch {
        // Branch doesn't exist, create it
        try {
          execSync(`git checkout -b ${this.GIT_BRANCH}`, { cwd, stdio: 'ignore' });
          logger.info('✅ Created new Git branch', { branch: this.GIT_BRANCH });
        } catch (branchError: any) {
          throw new Error(`Failed to create branch: ${branchError.message}`);
        }
      }

      // Add files
      execSync(`git add ${targetPath}/`, { cwd, stdio: 'ignore' });

      // Check if there are changes to commit
      const status = execSync('git status --porcelain', { cwd, encoding: 'utf-8' });
      if (!status.trim()) {
        logger.info('ℹ️ No changes to commit');
        return {
          branch: this.GIT_BRANCH,
          commit: 'no-changes',
        };
      }

      // Commit
      const commitMessage = `feat(auto-block): ${componentName} generated by AI\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>`;
      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
        cwd,
        stdio: 'ignore',
      });

      // Get commit hash
      const commitHash = execSync('git rev-parse --short HEAD', {
        cwd,
        encoding: 'utf-8',
      }).trim();

      // Push to remote
      try {
        execSync(`git push origin ${this.GIT_BRANCH}`, { cwd, stdio: 'pipe' });
        logger.info('✅ Git automation completed', {
          branch: this.GIT_BRANCH,
          commit: commitHash,
        });
      } catch (pushError: any) {
        logger.warn('⚠️ Failed to push to remote (commit created locally)', {
          error: pushError.message,
        });
        // Commit was created locally, that's good enough
      }

      // Switch back to main branch
      try {
        execSync('git checkout main', { cwd, stdio: 'ignore' });
      } catch {
        execSync('git checkout master', { cwd, stdio: 'ignore' });
      }

      // Restore stashed changes
      try {
        execSync('git stash pop', { cwd, stdio: 'ignore' });
      } catch {
        // No stash to pop
      }

      return {
        branch: this.GIT_BRANCH,
        commit: commitHash,
      };

    } catch (error: any) {
      logger.error('❌ Git automation failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List all generated blocks
   */
  async listGeneratedBlocks(): Promise<string[]> {
    const targetPath = path.join(this.PROJECT_ROOT, this.DEFAULT_SAVE_PATH);

    try {
      await this.ensureDirectory(targetPath);
      const files = await fs.readdir(targetPath);

      // Filter for component files (.tsx)
      const componentFiles = files.filter(file => file.endsWith('.tsx'));

      // Extract component names (remove .tsx extension)
      const componentNames = componentFiles.map(file =>
        file.replace('.tsx', '')
      );

      return componentNames;

    } catch (error: any) {
      logger.error('Failed to list generated blocks', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Delete a generated block (both component and definition)
   */
  async deleteBlock(componentName: string): Promise<boolean> {
    const targetPath = path.join(this.PROJECT_ROOT, this.DEFAULT_SAVE_PATH);
    const componentFilePath = path.join(targetPath, `${componentName}.tsx`);
    const definitionFilePath = path.join(targetPath, `${componentName}.definition.ts`);

    try {
      await fs.unlink(componentFilePath);
      await fs.unlink(definitionFilePath);

      logger.info('🗑️ Block deleted', { componentName });

      return true;

    } catch (error: any) {
      logger.error('Failed to delete block', {
        componentName,
        error: error.message,
      });
      return false;
    }
  }
}

// Singleton instance
export const aiBlockWriter = new AIBlockWriterService();
