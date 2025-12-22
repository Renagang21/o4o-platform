/**
 * Forum Core - Install Lifecycle Hook
 *
 * Executed when forum-core is installed for the first time.
 * Responsibilities:
 * - Create forum tables if they don't exist (adoptExistingTables support)
 * - Seed forum permissions
 * - Initialize default categories (optional)
 */

import type { InstallContext } from '@o4o/types';

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, options = {}, logger } = context;
  const { adoptExistingTables = true, seedDefaultData = false } = options;

  logger.info('[forum-core] Installing...');

  // 1. Check for existing tables
  if (adoptExistingTables) {
    const hasForumTables = await checkForumTablesExist(dataSource);
    if (hasForumTables) {
      logger.info('[forum-core] Existing forum tables found. Adopting them.');
    } else {
      logger.info('[forum-core] No existing tables. Will create during migration.');
    }
  }

  // 2. Seed forum permissions
  await seedForumPermissions(dataSource, logger);

  // 3. Seed default categories (optional)
  if (seedDefaultData) {
    await seedDefaultCategories(dataSource, logger);
  }

  logger.info('[forum-core] Installation completed successfully.');
}

/**
 * Check if forum tables exist in the database
 */
async function checkForumTablesExist(dataSource: any): Promise<boolean> {
  try {
    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    await queryRunner.release();

    const forumTables = [
      'forum_post',
      'forum_category',
      'forum_comment',
      'forum_tag',
    ];

    return forumTables.every((tableName) =>
      tables.some((table: any) => table.name === tableName)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Seed forum-core permissions
 * Note: Permissions are now managed by PermissionService in AppManager
 * This function is kept for backward compatibility
 */
async function seedForumPermissions(dataSource: any, logger: any): Promise<void> {
  const permissionRepository = dataSource.getRepository('Permission');

  const forumPermissions = [
    {
      key: 'forum.read',
      description: '포럼 게시글 읽기',
      category: 'forum',
      appId: 'forum-core',
    },
    {
      key: 'forum.write',
      description: '포럼 게시글 작성',
      category: 'forum',
      appId: 'forum-core',
    },
    {
      key: 'forum.comment',
      description: '포럼 댓글 작성',
      category: 'forum',
      appId: 'forum-core',
    },
    {
      key: 'forum.moderate',
      description: '포럼 모더레이션',
      category: 'forum',
      appId: 'forum-core',
    },
    {
      key: 'forum.admin',
      description: '포럼 관리',
      category: 'forum',
      appId: 'forum-core',
    },
  ];

  for (const perm of forumPermissions) {
    const exists = await permissionRepository.findOne({
      where: { key: perm.key },
    });

    if (!exists) {
      await permissionRepository.save(perm);
      logger.info(`[forum-core] Permission created: ${perm.key}`);
    } else {
      logger.info(`[forum-core] Permission exists: ${perm.key}`);
    }
  }
}

/**
 * Seed default forum categories
 */
async function seedDefaultCategories(dataSource: any, logger: any): Promise<void> {
  const categoryRepository = dataSource.getRepository('ForumCategory');

  const defaultCategories = [
    {
      name: '공지사항',
      slug: 'announcements',
      description: '중요한 공지사항',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: '자유게시판',
      slug: 'general',
      description: '자유로운 이야기',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: '질문답변',
      slug: 'qna',
      description: '질문과 답변',
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const cat of defaultCategories) {
    const exists = await categoryRepository.findOne({
      where: { slug: cat.slug },
    });

    if (!exists) {
      await categoryRepository.save(cat);
      logger.info(`[forum-core] Category created: ${cat.name}`);
    }
  }
}

export default install;
