import { DataSource, Repository } from 'typeorm';
import { ForumCategory } from '@o4o/forum-app';

/**
 * Organization-Forum Service
 *
 * Provides integration between organization-core and forum-app.
 * Automatically creates default forum categories for new organizations.
 */
export class OrganizationForumService {
  private categoryRepository: Repository<any>;

  constructor(private dataSource: DataSource) {
    // We use 'any' type to avoid circular dependency issues
    this.categoryRepository = dataSource.getRepository('ForumCategory');
  }

  /**
   * Create default forum categories for an organization
   *
   * @param organizationId - ID of the organization
   * @param organizationName - Name of the organization
   * @param creatorId - User ID who created the organization
   * @param categories - List of category names to create (optional)
   */
  async createDefaultCategoriesForOrganization(
    organizationId: string,
    organizationName: string,
    creatorId: string,
    categories: string[] = ['공지사항', '자유게시판', '질문/답변', '자료실']
  ): Promise<void> {
    console.log(
      `[organization-forum] Creating default categories for organization: ${organizationName} (${organizationId})`
    );

    const categoryData = categories.map((name, index) => ({
      name,
      description: `${organizationName} ${name}`,
      slug: this.generateSlug(`${organizationName}-${name}`),
      organizationId,
      isOrganizationExclusive: false, // Allow non-members to view
      createdBy: creatorId,
      sortOrder: index,
      isActive: true,
      requireApproval: false,
      accessLevel: 'member', // Only members can post
      postCount: 0,
    }));

    try {
      await this.categoryRepository.save(categoryData);
      console.log(
        `[organization-forum] Created ${categories.length} categories for ${organizationName}`
      );
    } catch (error) {
      console.error(
        `[organization-forum] Failed to create categories for ${organizationName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create a single category for an organization
   */
  async createCategoryForOrganization(
    organizationId: string,
    categoryData: {
      name: string;
      description?: string;
      createdBy: string;
      isOrganizationExclusive?: boolean;
      requireApproval?: boolean;
      accessLevel?: string;
    }
  ): Promise<any> {
    const category = this.categoryRepository.create({
      ...categoryData,
      organizationId,
      slug: this.generateSlug(categoryData.name),
      isActive: true,
      sortOrder: 0,
      postCount: 0,
    });

    return await this.categoryRepository.save(category);
  }

  /**
   * Get all categories for an organization
   */
  async getCategoriesForOrganization(organizationId: string): Promise<any[]> {
    return await this.categoryRepository.find({
      where: { organizationId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Delete all categories for an organization
   *
   * Note: This should be called when an organization is deleted
   */
  async deleteCategoriesForOrganization(organizationId: string): Promise<void> {
    await this.categoryRepository.delete({ organizationId });
    console.log(
      `[organization-forum] Deleted categories for organization: ${organizationId}`
    );
  }

  /**
   * Generate slug from text
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  }
}
