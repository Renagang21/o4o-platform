var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { LinkingStatus } from '../../../src/types/account-linking.js';
let LinkingSession = class LinkingSession {
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], LinkingSession.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar' }),
    __metadata("design:type", String)
], LinkingSession.prototype, "userId", void 0);
__decorate([
    ManyToOne('User', { onDelete: 'CASCADE' }),
    __metadata("design:type", Function)
], LinkingSession.prototype, "user", void 0);
__decorate([
    Column({
        type: 'enum',
        enum: ['email', 'google', 'kakao', 'naver']
    }),
    __metadata("design:type", String)
], LinkingSession.prototype, "provider", void 0);
__decorate([
    Column({
        type: 'enum',
        enum: LinkingStatus,
        default: LinkingStatus.PENDING
    }),
    __metadata("design:type", String)
], LinkingSession.prototype, "status", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LinkingSession.prototype, "verificationToken", void 0);
__decorate([
    Column({ type: 'timestamp' }),
    __metadata("design:type", Date)
], LinkingSession.prototype, "expiresAt", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], LinkingSession.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], LinkingSession.prototype, "createdAt", void 0);
LinkingSession = __decorate([
    Entity('linking_sessions'),
    Index(['userId', 'status']),
    Index(['verificationToken'], { unique: true })
], LinkingSession);
export { LinkingSession };
//# sourceMappingURL=LinkingSession.js.map