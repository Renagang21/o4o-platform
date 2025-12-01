var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
export var CommunityType;
(function (CommunityType) {
    CommunityType["PERSONAL"] = "personal";
    CommunityType["BRANCH"] = "branch";
    CommunityType["DIVISION"] = "division";
    CommunityType["GLOBAL"] = "global";
})(CommunityType || (CommunityType = {}));
let YaksaCommunity = class YaksaCommunity {
    // Methods
    canUserManage(userId, userRole) {
        if (['Super Administrator', 'Administrator'].includes(userRole))
            return true;
        if (this.ownerUserId === userId)
            return true;
        return false;
    }
    canUserView() {
        // All authenticated users can view communities
        return true;
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], YaksaCommunity.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], YaksaCommunity.prototype, "name", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], YaksaCommunity.prototype, "description", void 0);
__decorate([
    Column({ type: 'enum', enum: CommunityType, default: CommunityType.PERSONAL }),
    __metadata("design:type", String)
], YaksaCommunity.prototype, "type", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], YaksaCommunity.prototype, "ownerUserId", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], YaksaCommunity.prototype, "organizationId", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], YaksaCommunity.prototype, "requireApproval", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], YaksaCommunity.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], YaksaCommunity.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], YaksaCommunity.prototype, "updatedAt", void 0);
__decorate([
    ManyToOne('User', { nullable: true }),
    JoinColumn({ name: 'ownerUserId' }),
    __metadata("design:type", Function)
], YaksaCommunity.prototype, "owner", void 0);
__decorate([
    ManyToOne('Organization', { nullable: true }),
    JoinColumn({ name: 'organizationId' }),
    __metadata("design:type", Object)
], YaksaCommunity.prototype, "organization", void 0);
YaksaCommunity = __decorate([
    Entity('yaksa_forum_community'),
    Index(['type', 'ownerUserId']),
    Index(['organizationId'])
], YaksaCommunity);
export { YaksaCommunity };
//# sourceMappingURL=YaksaCommunity.js.map