/**
 * PharmacyAuthGuard
 *
 * 약국 역할 및 라이선스 검증 가드
 *
 * @package @o4o/pharmacyops
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface PharmacyUser {
  id: string;
  role: string;
  roles?: string[];
  pharmacyId?: string;
  pharmacyLicenseNumber?: string;
  pharmacyLicenseExpiry?: Date;
  pharmacyName?: string;
}

export interface PharmacyAuthOptions {
  /** 라이선스 검증 필요 여부 (기본: true) */
  requireLicense?: boolean;
  /** 라이선스 만료 검증 여부 (기본: true) */
  checkExpiry?: boolean;
  /** 허용된 역할 목록 (기본: ['pharmacy']) */
  allowedRoles?: string[];
}

const DEFAULT_OPTIONS: PharmacyAuthOptions = {
  requireLicense: true,
  checkExpiry: true,
  allowedRoles: ['pharmacy'],
};

@Injectable()
export class PharmacyAuthGuard implements CanActivate {
  constructor(private reflector?: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as PharmacyUser | undefined;

    // 1. 사용자 인증 확인
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // 2. 메타데이터에서 옵션 가져오기
    const options = this.getOptions(context);

    // 3. 역할 검증
    const hasValidRole = this.validateRole(user, options.allowedRoles || ['pharmacy']);
    if (!hasValidRole) {
      throw new ForbiddenException('Pharmacy role required');
    }

    // 4. 약국 ID 검증
    if (!user.pharmacyId) {
      throw new ForbiddenException('Pharmacy context required. Please register your pharmacy.');
    }

    // 5. 라이선스 검증
    if (options.requireLicense) {
      this.validateLicense(user, options.checkExpiry || true);
    }

    // 6. Request에 약국 정보 추가
    request.pharmacyId = user.pharmacyId;
    request.pharmacyLicenseNumber = user.pharmacyLicenseNumber;
    request.pharmacyName = user.pharmacyName;

    return true;
  }

  private getOptions(context: ExecutionContext): PharmacyAuthOptions {
    if (!this.reflector) {
      return DEFAULT_OPTIONS;
    }

    const handlerOptions = this.reflector.get<PharmacyAuthOptions>(
      'pharmacyAuthOptions',
      context.getHandler(),
    );
    const classOptions = this.reflector.get<PharmacyAuthOptions>(
      'pharmacyAuthOptions',
      context.getClass(),
    );

    return {
      ...DEFAULT_OPTIONS,
      ...classOptions,
      ...handlerOptions,
    };
  }

  private validateRole(user: PharmacyUser, allowedRoles: string[]): boolean {
    // 단일 역할 확인
    if (user.role && allowedRoles.includes(user.role)) {
      return true;
    }

    // 복수 역할 확인
    if (user.roles && user.roles.some((role) => allowedRoles.includes(role))) {
      return true;
    }

    return false;
  }

  private validateLicense(user: PharmacyUser, checkExpiry: boolean): void {
    // 라이선스 번호 확인
    if (!user.pharmacyLicenseNumber) {
      throw new ForbiddenException(
        'Pharmacy license required. Please register your pharmacy license.',
      );
    }

    // 라이선스 만료일 확인
    if (checkExpiry && user.pharmacyLicenseExpiry) {
      const now = new Date();
      if (user.pharmacyLicenseExpiry < now) {
        throw new ForbiddenException(
          'Pharmacy license has expired. Please renew your license.',
        );
      }
    }
  }
}

/**
 * 약국 인증 데코레이터
 *
 * @example
 * @PharmacyAuth() // 기본 설정 (라이선스 필수)
 * @PharmacyAuth({ requireLicense: false }) // 라이선스 선택
 */
export function PharmacyAuth(options?: PharmacyAuthOptions) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    const metadata = { ...DEFAULT_OPTIONS, ...options };

    if (descriptor) {
      // 메서드 데코레이터
      Reflect.defineMetadata('pharmacyAuthOptions', metadata, descriptor.value);
    } else {
      // 클래스 데코레이터
      Reflect.defineMetadata('pharmacyAuthOptions', metadata, target);
    }
  };
}

/**
 * 약국 ID 추출 헬퍼
 */
export function getPharmacyId(request: any): string {
  return request.pharmacyId;
}

/**
 * 약국 라이선스 번호 추출 헬퍼
 */
export function getPharmacyLicenseNumber(request: any): string {
  return request.pharmacyLicenseNumber;
}

/**
 * 약국 정보 추출 헬퍼
 */
export function getPharmacyContext(request: any): {
  pharmacyId: string;
  pharmacyLicenseNumber: string;
  pharmacyName?: string;
} {
  return {
    pharmacyId: request.pharmacyId,
    pharmacyLicenseNumber: request.pharmacyLicenseNumber,
    pharmacyName: request.pharmacyName,
  };
}
