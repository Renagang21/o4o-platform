import { MigrationInterface, QueryRunner } from 'typeorm';
import { AIReference } from '../../entities/AIReference';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration: Seed Initial AI References
 *
 * Imports existing documentation from /docs folder into database:
 * - docs/manual/blocks-reference.md -> blocks reference
 * - docs/ai/shortcode-registry.md -> shortcodes reference
 */
export class SeedInitialAIReferences1830000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const aiReferenceRepository = queryRunner.manager.getRepository(AIReference);

    // Path to docs folder (adjust based on runtime location)
    const docsPath = path.resolve(__dirname, '../../../docs');

    try {
      // 1. Blocks Reference
      const blocksRefPath = path.join(docsPath, 'manual/blocks-reference.md');
      if (fs.existsSync(blocksRefPath)) {
        const blocksContent = fs.readFileSync(blocksRefPath, 'utf-8');

        const blocksRef = aiReferenceRepository.create({
          type: 'blocks',
          name: 'blocks-reference',
          description: 'Complete block reference for AI page generation (Korean)',
          content: blocksContent,
          format: 'markdown',
          version: '0.7.0',
          schemaVersion: '1.0',
          appSlug: null, // Available to all apps
          status: 'active'
        });

        await aiReferenceRepository.save(blocksRef);
        console.log('✅ Seeded: blocks-reference');
      } else {
        console.warn('⚠️  Blocks reference not found at:', blocksRefPath);
      }

      // 2. Shortcode Registry
      const shortcodeRefPath = path.join(docsPath, 'ai/shortcode-registry.md');
      if (fs.existsSync(shortcodeRefPath)) {
        const shortcodeContent = fs.readFileSync(shortcodeRefPath, 'utf-8');

        const shortcodeRef = aiReferenceRepository.create({
          type: 'shortcodes',
          name: 'shortcode-registry',
          description: 'Complete shortcode registry for AI (19 shortcodes)',
          content: shortcodeContent,
          format: 'markdown',
          version: '1.0',
          schemaVersion: '1.0',
          appSlug: null, // Available to all apps
          status: 'active'
        });

        await aiReferenceRepository.save(shortcodeRef);
        console.log('✅ Seeded: shortcode-registry');
      } else {
        console.warn('⚠️  Shortcode registry not found at:', shortcodeRefPath);
      }

      console.log('✅ Initial AI references seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding AI references:', error);
      // Don't throw - allow migration to continue even if seeding fails
      // This is useful in production where docs folder might not be available
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM ai_references
      WHERE name IN ('blocks-reference', 'shortcode-registry')
    `);
  }
}
