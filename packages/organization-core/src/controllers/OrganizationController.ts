/**
 * OrganizationController
 *
 * 조직 관리 API 컨트롤러
 *
 * 이 파일은 NestJS 스타일의 컨트롤러 스켈레톤입니다.
 * 실제 API 서버에서는 @nestjs/common 데코레이터를 사용하여 등록됩니다.
 */

import { OrganizationService } from '../services/OrganizationService';
import { OrganizationMemberService } from '../services/OrganizationMemberService';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  ListOrganizationDto,
  CreateOrganizationMemberDto,
  UpdateOrganizationMemberDto,
  ListOrganizationMemberDto,
} from '../types/dtos';

/**
 * Organization Controller
 *
 * @Controller('api/organization')
 */
export class OrganizationController {
  constructor(
    private organizationService: OrganizationService,
    private memberService: OrganizationMemberService
  ) {}

  /**
   * 조직 목록 조회
   *
   * @Get()
   * @RequirePermission('organization.read')
   */
  async list(query: ListOrganizationDto) {
    return await this.organizationService.listOrganizations(query);
  }

  /**
   * 조직 상세 조회
   *
   * @Get(':id')
   * @RequirePermission('organization.read')
   */
  async get(
    id: string,
    query?: {
      includeParent?: boolean;
      includeChildren?: boolean;
      includeMemberCount?: boolean;
    }
  ) {
    return await this.organizationService.getOrganization(id, query);
  }

  /**
   * 조직 생성
   *
   * @Post()
   * @RequirePermission('organization.manage')
   */
  async create(dto: CreateOrganizationDto) {
    return await this.organizationService.createOrganization(dto);
  }

  /**
   * 조직 수정
   *
   * @Put(':id')
   * @RequirePermission('organization.manage')
   */
  async update(id: string, dto: UpdateOrganizationDto) {
    return await this.organizationService.updateOrganization(id, dto);
  }

  /**
   * 조직 삭제
   *
   * @Delete(':id')
   * @RequirePermission('organization.manage')
   */
  async delete(id: string) {
    await this.organizationService.deleteOrganization(id);
    return { deleted: true, id };
  }

  /**
   * 하위 조직 조회
   *
   * @Get(':id/descendants')
   * @RequirePermission('organization.read')
   */
  async getDescendants(
    id: string,
    query?: { maxDepth?: number; includeInactive?: boolean }
  ) {
    return await this.organizationService.getDescendants(id, query);
  }

  /**
   * 조직 멤버 목록 조회
   *
   * @Get(':id/members')
   * @RequirePermission('organization.member.read')
   */
  async getMembers(id: string, query: ListOrganizationMemberDto) {
    return await this.memberService.listMembers(id, query);
  }

  /**
   * 조직 멤버 추가
   *
   * @Post(':id/members')
   * @RequirePermission('organization.member.manage')
   */
  async addMember(id: string, dto: CreateOrganizationMemberDto) {
    return await this.memberService.addMember(id, dto);
  }

  /**
   * 조직 멤버 역할 수정
   *
   * @Put(':id/members/:userId')
   * @RequirePermission('organization.member.manage')
   */
  async updateMember(
    id: string,
    userId: string,
    dto: UpdateOrganizationMemberDto
  ) {
    return await this.memberService.updateMemberRole(id, userId, dto);
  }

  /**
   * 조직 멤버 삭제 (탈퇴)
   *
   * @Delete(':id/members/:userId')
   * @RequirePermission('organization.member.manage')
   */
  async removeMember(id: string, userId: string) {
    await this.memberService.removeMember(id, userId);
    return { deleted: true, organizationId: id, userId };
  }

  /**
   * 사용자의 조직 목록 조회
   *
   * @Get('my')
   * @RequirePermission('organization.read')
   */
  async getMyOrganizations(userId: string, includeLeft: boolean = false) {
    return await this.memberService.getUserOrganizations(userId, includeLeft);
  }
}
