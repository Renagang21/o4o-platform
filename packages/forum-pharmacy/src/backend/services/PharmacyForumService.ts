/**
 * PharmacyForumService - 약사 포럼 핵심 서비스
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * forum-core를 확장하여 약사 서비스 맥락 제공
 * - 작성자 유형 결정
 * - 접근 범위 검증
 * - 책임 고지 적용
 */

import type { DataSource } from 'typeorm';
import {
  PharmacyAuthorType,
  PharmacyStatementScope,
  PharmacyDisclaimerType,
  PharmacyBoardType,
  PharmacyForumMeta,
} from '../types/index.js';

/**
 * 사용자 정보 (외부에서 주입)
 */
export interface PharmacyUserInfo {
  id: string;
  /** 약사 유형: PHARMACY_OWNER | PHARMACY_EMPLOYEE | null */
  pharmacistType?: 'PHARMACY_OWNER' | 'PHARMACY_EMPLOYEE' | null;
  /** 사업자 여부 */
  isBusinessOperator?: boolean;
  /** 약국 ID (소속 약국) */
  pharmacyId?: string;
  /** 약국명 */
  pharmacyName?: string;
  /** 조직 ID */
  organizationId?: string;
  /** 조직명 */
  organizationName?: string;
}

/**
 * 약사 포럼 핵심 서비스
 */
export class PharmacyForumService {
  private dataSource: DataSource | null = null;

  /**
   * 데이터소스 초기화
   */
  init(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * 사용자 정보로부터 작성자 유형 결정
   *
   * A. 발언 맥락 표시 (Context Attribution)
   */
  determineAuthorType(user: PharmacyUserInfo): PharmacyAuthorType {
    if (user.pharmacistType === 'PHARMACY_OWNER') {
      return PharmacyAuthorType.PHARMACY_OWNER;
    }
    if (user.pharmacistType === 'PHARMACY_EMPLOYEE') {
      return PharmacyAuthorType.PHARMACY_EMPLOYEE;
    }
    if (user.isBusinessOperator) {
      return PharmacyAuthorType.BUSINESS_OPERATOR;
    }
    return PharmacyAuthorType.GENERAL_USER;
  }

  /**
   * 게시글 작성 시 기본 메타데이터 생성
   */
  createPostMetadata(
    user: PharmacyUserInfo,
    options: {
      statementScope?: PharmacyStatementScope;
      showProfessionalBadge?: boolean;
      boardType?: PharmacyBoardType;
    } = {}
  ): PharmacyForumMeta {
    const authorType = this.determineAuthorType(user);
    const isProfessional =
      authorType === PharmacyAuthorType.PHARMACY_OWNER ||
      authorType === PharmacyAuthorType.PHARMACY_EMPLOYEE;

    // 기본 발언 범위 결정
    const statementScope =
      options.statementScope ||
      (isProfessional
        ? PharmacyStatementScope.PROFESSIONAL
        : PharmacyStatementScope.PERSONAL);

    // 기본 책임 고지 결정
    const disclaimerType = this.determineDisclaimerType(authorType, statementScope);

    return {
      authorType,
      statementScope,
      disclaimerType,
      pharmacyId: user.pharmacyId,
      pharmacyName: user.pharmacyName,
      showProfessionalBadge: isProfessional && options.showProfessionalBadge !== false,
      boardType: options.boardType,
    };
  }

  /**
   * 책임 고지 유형 결정
   *
   * C. 책임 경계 명확화 (Responsibility Boundary)
   */
  determineDisclaimerType(
    authorType: PharmacyAuthorType,
    statementScope: PharmacyStatementScope
  ): PharmacyDisclaimerType {
    // 전문 발언인 경우
    if (statementScope === PharmacyStatementScope.PROFESSIONAL) {
      return PharmacyDisclaimerType.PROFESSIONAL_PERSONAL;
    }

    // 약국 단위 발언인 경우
    if (statementScope === PharmacyStatementScope.PHARMACY_UNIT) {
      return PharmacyDisclaimerType.NOT_OFFICIAL;
    }

    // 일반 개인 의견
    return PharmacyDisclaimerType.PERSONAL_OPINION;
  }

  /**
   * 게시판 접근 권한 확인
   *
   * B. 접근 범위 설정 (Scoped Visibility)
   */
  canAccessBoard(
    user: PharmacyUserInfo,
    boardType: PharmacyBoardType,
    boardPharmacyId?: string,
    boardOrganizationId?: string
  ): boolean {
    const authorType = this.determineAuthorType(user);

    switch (boardType) {
      case PharmacyBoardType.PHARMACIST_ONLY:
        // 약사만 접근 가능
        return (
          authorType === PharmacyAuthorType.PHARMACY_OWNER ||
          authorType === PharmacyAuthorType.PHARMACY_EMPLOYEE
        );

      case PharmacyBoardType.PHARMACY_PRIVATE:
        // 해당 약국 구성원만 접근 가능
        return !!user.pharmacyId && user.pharmacyId === boardPharmacyId;

      case PharmacyBoardType.ORGANIZATION:
        // 해당 조직 구성원만 접근 가능
        return !!user.organizationId && user.organizationId === boardOrganizationId;

      case PharmacyBoardType.PUBLIC:
        // 모든 사용자 접근 가능
        return true;

      default:
        return false;
    }
  }

  /**
   * 게시글 작성 권한 확인
   */
  canWritePost(
    user: PharmacyUserInfo,
    boardType: PharmacyBoardType,
    boardPharmacyId?: string,
    boardOrganizationId?: string
  ): boolean {
    // 우선 접근 권한이 있어야 함
    if (!this.canAccessBoard(user, boardType, boardPharmacyId, boardOrganizationId)) {
      return false;
    }

    // 접근 가능하면 작성도 가능 (forum-core의 권한 체크와 함께 사용)
    return true;
  }

  /**
   * 게시글의 PharmacyForumMeta 추출
   * - ForumPostMetadata.extensions.pharmacy에서 추출
   */
  extractPharmacyMeta(
    postMetadata: Record<string, unknown> | null | undefined
  ): PharmacyForumMeta | null {
    if (!postMetadata) return null;

    // extensions.pharmacy 경로
    const extensions = postMetadata.extensions as Record<string, unknown> | undefined;
    if (extensions?.pharmacy) {
      return extensions.pharmacy as PharmacyForumMeta;
    }

    // 레거시: 직접 pharmacy 필드
    if (postMetadata.pharmacy) {
      return postMetadata.pharmacy as PharmacyForumMeta;
    }

    return null;
  }

  /**
   * ForumPostMetadata 형식으로 PharmacyForumMeta 래핑
   */
  wrapAsPostMetadata(pharmacyMeta: PharmacyForumMeta): Record<string, unknown> {
    return {
      extensions: {
        pharmacy: pharmacyMeta,
      },
    };
  }
}

// 싱글톤 인스턴스
export const pharmacyForumService = new PharmacyForumService();
