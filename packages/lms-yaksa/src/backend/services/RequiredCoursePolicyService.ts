import type { Repository, DataSource } from 'typeorm';
import { RequiredCoursePolicy } from '../entities/RequiredCoursePolicy.entity.js';

/**
 * RequiredCoursePolicyService
 *
 * Manages required course policies for organizations.
 * Handles policy CRUD, activation/deactivation, and validation.
 */
export class RequiredCoursePolicyService {
  private repo: Repository<RequiredCoursePolicy>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(RequiredCoursePolicy);
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: string): Promise<RequiredCoursePolicy | null> {
    return this.repo.findOne({ where: { id: policyId } });
  }

  /**
   * Get all policies for an organization
   */
  async getPoliciesByOrganization(organizationId: string): Promise<RequiredCoursePolicy[]> {
    return this.repo.find({
      where: { organizationId },
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get active policies for an organization
   */
  async getActivePolicies(organizationId: string): Promise<RequiredCoursePolicy[]> {
    return this.repo.find({
      where: { organizationId, isActive: true },
      order: { priority: 'ASC' },
    });
  }

  /**
   * Create a new policy
   */
  async createPolicy(
    organizationId: string,
    payload: Partial<RequiredCoursePolicy>
  ): Promise<RequiredCoursePolicy> {
    // Validate before creating
    await this.validatePolicy(organizationId, payload);

    const policy = this.repo.create({
      ...payload,
      organizationId,
      isActive: payload.isActive ?? true,
      requiredCourseIds: payload.requiredCourseIds ?? [],
      requiredCredits: payload.requiredCredits ?? 0,
      priority: payload.priority ?? 100,
    });

    return this.repo.save(policy);
  }

  /**
   * Update a policy
   */
  async updatePolicy(
    policyId: string,
    payload: Partial<RequiredCoursePolicy>
  ): Promise<RequiredCoursePolicy | null> {
    const existing = await this.getPolicy(policyId);
    if (!existing) return null;

    // Validate if changing organization or courses
    if (payload.organizationId || payload.requiredCourseIds) {
      await this.validatePolicy(
        payload.organizationId ?? existing.organizationId,
        { ...existing, ...payload },
        policyId
      );
    }

    await this.repo.update(policyId, payload);
    return this.getPolicy(policyId);
  }

  /**
   * Set policy active/inactive status
   */
  async setActive(policyId: string, isActive: boolean): Promise<RequiredCoursePolicy | null> {
    await this.repo.update(policyId, { isActive });
    return this.getPolicy(policyId);
  }

  /**
   * Get required course IDs for an organization
   * Combines all active policies
   */
  async getRequiredCourseIds(organizationId: string): Promise<string[]> {
    const policies = await this.getActivePolicies(organizationId);
    const courseIds = new Set<string>();

    for (const policy of policies) {
      if (policy.isCurrentlyValid()) {
        for (const courseId of policy.requiredCourseIds) {
          courseIds.add(courseId);
        }
      }
    }

    return Array.from(courseIds);
  }

  /**
   * Get total required credits for an organization
   */
  async getRequiredCredits(organizationId: string): Promise<number> {
    const policies = await this.getActivePolicies(organizationId);
    let maxCredits = 0;

    for (const policy of policies) {
      if (policy.isCurrentlyValid()) {
        maxCredits = Math.max(maxCredits, Number(policy.requiredCredits));
      }
    }

    return maxCredits;
  }

  /**
   * Validate policy for conflicts and consistency
   * @throws Error if validation fails
   */
  async validatePolicy(
    organizationId: string,
    payload: Partial<RequiredCoursePolicy>,
    excludePolicyId?: string
  ): Promise<void> {
    // Check for duplicate policy names
    if (payload.name) {
      const existing = await this.repo.findOne({
        where: { organizationId, name: payload.name },
      });

      if (existing && existing.id !== excludePolicyId) {
        throw new Error(`Policy with name "${payload.name}" already exists for this organization`);
      }
    }

    // Validate required courses exist (would need lms-core integration)
    // For now, just validate the structure
    if (payload.requiredCourseIds && !Array.isArray(payload.requiredCourseIds)) {
      throw new Error('requiredCourseIds must be an array');
    }

    // Validate date range
    if (payload.validFrom && payload.validUntil) {
      const from = new Date(payload.validFrom);
      const until = new Date(payload.validUntil);
      if (from >= until) {
        throw new Error('validFrom must be before validUntil');
      }
    }
  }

  /**
   * Add a course to policy's required list
   */
  async addRequiredCourse(policyId: string, courseId: string): Promise<RequiredCoursePolicy | null> {
    const policy = await this.getPolicy(policyId);
    if (!policy) return null;

    if (!policy.requiredCourseIds.includes(courseId)) {
      policy.requiredCourseIds.push(courseId);
      await this.repo.update(policyId, {
        requiredCourseIds: policy.requiredCourseIds,
      });
    }

    return this.getPolicy(policyId);
  }

  /**
   * Remove a course from policy's required list
   */
  async removeRequiredCourse(policyId: string, courseId: string): Promise<RequiredCoursePolicy | null> {
    const policy = await this.getPolicy(policyId);
    if (!policy) return null;

    policy.requiredCourseIds = policy.requiredCourseIds.filter(id => id !== courseId);
    await this.repo.update(policyId, {
      requiredCourseIds: policy.requiredCourseIds,
    });

    return this.getPolicy(policyId);
  }

  /**
   * Check if a course is required by any active policy
   */
  async isCourseRequired(organizationId: string, courseId: string): Promise<boolean> {
    const requiredCourses = await this.getRequiredCourseIds(organizationId);
    return requiredCourses.includes(courseId);
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    const result = await this.repo.delete(policyId);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get policies applicable to a specific member type
   */
  async getPoliciesForMemberType(
    organizationId: string,
    memberType: string
  ): Promise<RequiredCoursePolicy[]> {
    const policies = await this.getActivePolicies(organizationId);
    return policies.filter(policy => {
      if (!policy.targetMemberTypes || policy.targetMemberTypes.length === 0) {
        return true; // Applies to all if no specific types
      }
      return policy.targetMemberTypes.includes(memberType) ||
             policy.targetMemberTypes.includes('all');
    });
  }

  // ===== Phase 1: Pharmacist Type Integration =====

  /**
   * Phase 1: Get policies applicable to a specific pharmacist type
   *
   * Filters policies by pharmacistType from membership-yaksa.
   * If targetPharmacistTypes is empty/null, the policy applies to all.
   *
   * @param organizationId - Organization ID
   * @param pharmacistType - PharmacistType from membership-yaksa ('working' | 'owner' | etc)
   */
  async getPoliciesForPharmacistType(
    organizationId: string,
    pharmacistType: string
  ): Promise<RequiredCoursePolicy[]> {
    const policies = await this.getActivePolicies(organizationId);
    return policies.filter(policy => {
      if (!policy.targetPharmacistTypes || policy.targetPharmacistTypes.length === 0) {
        return true; // Applies to all if no specific types
      }
      return policy.targetPharmacistTypes.includes(pharmacistType) ||
             policy.targetPharmacistTypes.includes('all');
    });
  }

  /**
   * Phase 1: Get required credits for a specific pharmacist type
   *
   * @param organizationId - Organization ID
   * @param pharmacistType - PharmacistType from membership-yaksa
   */
  async getRequiredCreditsForPharmacistType(
    organizationId: string,
    pharmacistType: string
  ): Promise<number> {
    const policies = await this.getPoliciesForPharmacistType(organizationId, pharmacistType);
    let maxCredits = 0;

    for (const policy of policies) {
      if (policy.isCurrentlyValid()) {
        maxCredits = Math.max(maxCredits, Number(policy.requiredCredits));
      }
    }

    return maxCredits;
  }

  /**
   * Phase 1: Get required course IDs for a specific pharmacist type
   *
   * @param organizationId - Organization ID
   * @param pharmacistType - PharmacistType from membership-yaksa
   */
  async getRequiredCourseIdsForPharmacistType(
    organizationId: string,
    pharmacistType: string
  ): Promise<string[]> {
    const policies = await this.getPoliciesForPharmacistType(organizationId, pharmacistType);
    const courseIds = new Set<string>();

    for (const policy of policies) {
      if (policy.isCurrentlyValid()) {
        for (const courseId of policy.requiredCourseIds) {
          courseIds.add(courseId);
        }
      }
    }

    return Array.from(courseIds);
  }
}
