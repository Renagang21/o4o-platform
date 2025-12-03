var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique, } from 'typeorm';
import { User } from './User.js';
/**
 * 역할 할당 (Assignment)
 *
 * 승인된 역할을 사용자에게 실제로 할당합니다.
 * 권한 판정(RBAC)은 이 테이블의 `isActive = true` 레코드를 기준으로 합니다.
 *
 * 제약:
 * - 한 사용자는 동일 역할을 한 번만 active로 가질 수 있음
 *
 * @see 04_rbac_policy.md
 */
let RoleAssignment = class RoleAssignment {
    // Helper methods
    /**
     * 현재 시점에 유효한 역할인지 체크
     */
    isValidNow() {
        if (!this.isActive) {
            return false;
        }
        const now = new Date();
        // validFrom 체크
        if (this.validFrom > now) {
            return false;
        }
        // validUntil 체크
        if (this.validUntil && this.validUntil < now) {
            return false;
        }
        return true;
    }
    /**
     * 역할 비활성화
     */
    deactivate() {
        this.isActive = false;
    }
    /**
     * 역할 활성화
     */
    activate() {
        this.isActive = true;
    }
    /**
     * 유효 기간 설정
     */
    setValidityPeriod(from, until) {
        this.validFrom = from;
        this.validUntil = until;
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], RoleAssignment.prototype, "id", void 0);
__decorate([
    Column({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], RoleAssignment.prototype, "userId", void 0);
__decorate([
    ManyToOne(() => User, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'user_id' }),
    __metadata("design:type", User)
], RoleAssignment.prototype, "user", void 0);
__decorate([
    Column({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], RoleAssignment.prototype, "role", void 0);
__decorate([
    Column({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RoleAssignment.prototype, "isActive", void 0);
__decorate([
    Column({ name: 'valid_from', type: 'timestamp', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], RoleAssignment.prototype, "validFrom", void 0);
__decorate([
    Column({ name: 'valid_until', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], RoleAssignment.prototype, "validUntil", void 0);
__decorate([
    Column({ name: 'assigned_at', type: 'timestamp', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], RoleAssignment.prototype, "assignedAt", void 0);
__decorate([
    Column({ name: 'assigned_by', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], RoleAssignment.prototype, "assignedBy", void 0);
__decorate([
    ManyToOne(() => User, { nullable: true }),
    JoinColumn({ name: 'assigned_by' }),
    __metadata("design:type", User)
], RoleAssignment.prototype, "assigner", void 0);
__decorate([
    CreateDateColumn({ name: 'created_at' }),
    __metadata("design:type", Date)
], RoleAssignment.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({ name: 'updated_at' }),
    __metadata("design:type", Date)
], RoleAssignment.prototype, "updatedAt", void 0);
RoleAssignment = __decorate([
    Entity('role_assignments'),
    Index(['userId']),
    Index(['role']),
    Index(['isActive']),
    Index(['userId', 'isActive']),
    Index(['userId', 'role']),
    Unique('unique_active_role_per_user', ['userId', 'role', 'isActive'])
], RoleAssignment);
export { RoleAssignment };
//# sourceMappingURL=RoleAssignment.js.map