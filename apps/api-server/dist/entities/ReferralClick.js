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
exports.ReferralClick = void 0;
const typeorm_1 = require("typeorm");
const AffiliateUser_1 = require("./AffiliateUser");
let ReferralClick = class ReferralClick {
};
exports.ReferralClick = ReferralClick;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReferralClick.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10 }),
    __metadata("design:type", String)
], ReferralClick.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], ReferralClick.prototype, "affiliateUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => AffiliateUser_1.AffiliateUser),
    (0, typeorm_1.JoinColumn)({ name: 'affiliateUserId' }),
    __metadata("design:type", AffiliateUser_1.AffiliateUser)
], ReferralClick.prototype, "affiliateUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], ReferralClick.prototype, "clickedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 45 }),
    __metadata("design:type", String)
], ReferralClick.prototype, "ip", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], ReferralClick.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ReferralClick.prototype, "referer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['kakao', 'facebook', 'band', 'direct', 'qr', 'other'],
        nullable: true
    }),
    __metadata("design:type", String)
], ReferralClick.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], ReferralClick.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ReferralClick.prototype, "landingPage", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ReferralClick.prototype, "converted", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], ReferralClick.prototype, "convertedUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ReferralClick.prototype, "convertedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReferralClick.prototype, "createdAt", void 0);
exports.ReferralClick = ReferralClick = __decorate([
    (0, typeorm_1.Entity)('referral_clicks'),
    (0, typeorm_1.Index)(['referralCode']),
    (0, typeorm_1.Index)(['clickedAt']),
    (0, typeorm_1.Index)(['converted']),
    (0, typeorm_1.Index)(['ip'])
], ReferralClick);
//# sourceMappingURL=ReferralClick.js.map