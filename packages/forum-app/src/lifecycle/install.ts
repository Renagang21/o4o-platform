/**
 * Forum Core - Install Lifecycle Hook
 *
 * Executed when forum-core is installed for the first time.
 * Responsibilities:
 * - Create forum tables if they don't exist (adoptExistingTables support)
 * - Seed forum permissions
 * - Initialize default categories (optional)
 */

export interface InstallContext {
  appId: string;
  version: string;
  db: any; // TypeORM connection
  options?: {
    adoptExistingTables?: boolean;
    seedDefaultData?: boolean;
  };
}

export async function install(context: InstallContext): Promise<void> {
  const { db, options = {} } = context;
  const { adoptExistingTables = true, seedDefaultData = false } = options;

  console.log('[forum-core] Installing...');

  // 1. Check for existing tables
  if (adoptExistingTables) {
    const hasForumTables = await checkForumTablesExist(db);
    if (hasForumTables) {
      console.log('[forum-core] Existing forum tables found. Adopting them.');
    } else {
      console.log('[forum-core] No existing tables. Will create during migration.');
    }
  }

  // 2. Seed forum permissions
  await seedForumPermissions(db);

  // 3. Seed default categories (optional)
  if (seedDefaultData) {
    await seedDefaultCategories(db);
  }

  console.log('[forum-core] Installation completed successfully.');
}

/**
 * Check if forum tables exist in the database
 */
async function checkForumTablesExist(db: any): Promise<boolean> {
  try {
    const queryRunner = db.createQueryRunner();
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
    console.error('[forum-core] Error checking tables:', error);
    return false;
  }
}

/**
 * Seed forum-core permissions
 */
async function seedForumPermissions(db: any): Promise<void> {
  const permissionRepository = db.getRepository('Permission');

  const forumPermissions = [
    {
      name: 'forum.read',
      description: '포럼 게시글 읽기',
      resource: 'forum',
      action: 'read',
    },
    {
      name: 'forum.write',
      description: '포럼 게시글 작성',
      resource: 'forum',
      action: 'write',
    },
    {
      name: 'forum.comment',
      description: '포럼 댓글 작성',
      resource: 'forum',
      action: 'comment',
    },
    {
      name: 'forum.moderate',
      description: '포럼 모더레이션',
      resource: 'forum',
      action: 'moderate',
    },
    {
      name: 'forum.admin',
      description: '포럼 관리',
      resource: 'forum',
      action: 'admin',
    },
  ];

  for (const perm of forumPermissions) {
    const exists = await permissionRepository.findOne({
      where: { name: perm.name },
    });

    if (!exists) {
      await permissionRepository.save(perm);
      console.log(`[forum-core] Permission created: ${perm.name}`);
    } else {
      console.log(`[forum-core] Permission exists: ${perm.name}`);
    }
  }
}

/**
 * Seed default forum categories
 */
async function seedDefaultCategories(db: any): Promise<void> {
  const categoryRepository = db.getRepository('ForumCategory');

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
      console.log(`[forum-core] Category created: ${cat.name}`);
    }
  }
}

export default install;
