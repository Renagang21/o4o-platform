var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
export var CommunityMemberRole;
(function (CommunityMemberRole) {
    CommunityMemberRole["OWNER"] = "owner";
    CommunityMemberRole["ADMIN"] = "admin";
    CommunityMemberRole["MEMBER"] = "member";
})(CommunityMemberRole || (CommunityMemberRole = {}));
let YaksaCommunityMember = class YaksaCommunityMember {
    // Methods
    canManageCommunity() {
        return this.role === CommunityMemberRole.OWNER || this.role === CommunityMemberRole.ADMIN;
    }
    canPost() {
        // All members can post
        return true;
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], YaksaCommunityMember.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], YaksaCommunityMember.prototype, "communityId", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], YaksaCommunityMember.prototype, "userId", void 0);
__decorate([
    Column({ type: 'enum', enum: CommunityMemberRole, default: CommunityMemberRole.MEMBER }),
    __metadata("design:type", String)
], YaksaCommunityMember.prototype, "role", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], YaksaCommunityMember.prototype, "joinedAt", void 0);
__decorate([
    ManyToOne('YaksaCommunity', { lazy: true }),
    JoinColumn({ name: 'communityId' }),
    __metadata("design:type", Promise)
], YaksaCommunityMember.prototype, "community", void 0);
__decorate([
    ManyToOne('User'),
    JoinColumn({ name: 'userId' }),
    __metadata("design:type", Function)
], YaksaCommunityMember.prototype, "user", void 0);
YaksaCommunityMember = __decorate([
    Entity('yaksa_forum_community_member'),
    Unique(['communityId', 'userId']),
    Index(['communityId', 'role'])
], YaksaCommunityMember);
export { YaksaCommunityMember };
//# sourceMappingURL=YaksaCommunityMember.js.map