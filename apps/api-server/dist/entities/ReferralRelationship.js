"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralRelationship = void 0;
const typeorm_1 = require("typeorm");
const AffiliateUser_1 = require("./AffiliateUser");
const User_1 = require("./User");
let ReferralRelationship = class ReferralRelationship {
    // 단일 단계 추천 검증
    get isValidReferral() {
        // 자기 자신 추천 불가
        if (this.referrerId === this.referredId) {
            return false;
        }
        return true;
    }
};
exports.ReferralRelationship = ReferralRelationship;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "referrerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => AffiliateUser_1.AffiliateUser),
    (0, typeorm_1.JoinColumn)({ name: 'referrerId' }),
    __metadata("design:type", AffiliateUser_1.AffiliateUser)
], ReferralRelationship.prototype, "referrer", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "referredId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'referredId' }),
    __metadata("design:type", User_1.User)
], ReferralRelationship.prototype, "referred", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10 }),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], ReferralRelationship.prototype, "signupDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ReferralRelationship.prototype, "firstOrderDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'confirmed', 'expired'],
        default: 'pending'
    }),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "signupIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "signupDevice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['kakao', 'facebook', 'band', 'direct', 'qr', 'other'],
        nullable: true
    }),
    __metadata("design:type", String)
], ReferralRelationship.prototype, "signupSource", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReferralRelationship.prototype, "createdAt", void 0);
exports.ReferralRelationship = ReferralRelationship = __decorate([
    (0, typeorm_1.Entity)('referral_relationships'),
    (0, typeorm_1.Index)(['referralCode']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['signupDate']),
    (0, typeorm_1.Unique)(['referrerId', 'referredId']) // 중복 추천 방지
], ReferralRelationship);
//# sourceMappingURL=ReferralRelationship.js.map