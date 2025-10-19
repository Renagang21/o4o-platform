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
exports.SignageContent = exports.ContentStatus = exports.ContentType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var ContentType;
(function (ContentType) {
    ContentType["YOUTUBE"] = "youtube";
    ContentType["VIMEO"] = "vimeo";
})(ContentType || (exports.ContentType = ContentType = {}));
var ContentStatus;
(function (ContentStatus) {
    ContentStatus["PENDING"] = "pending";
    ContentStatus["APPROVED"] = "approved";
    ContentStatus["REJECTED"] = "rejected";
    ContentStatus["INACTIVE"] = "inactive";
})(ContentStatus || (exports.ContentStatus = ContentStatus = {}));
let SignageContent = class SignageContent {
    // Business logic methods
    canBeApprovedBy(user) {
        return user.role === 'admin';
    }
    isApproved() {
        return this.status === ContentStatus.APPROVED;
    }
    isAvailableForStores() {
        return this.status === ContentStatus.APPROVED && this.isPublic;
    }
};
exports.SignageContent = SignageContent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SignageContent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SignageContent.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SignageContent.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ContentType
    }),
    __metadata("design:type", String)
], SignageContent.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SignageContent.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SignageContent.prototype, "videoId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SignageContent.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], SignageContent.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ContentStatus,
        default: ContentStatus.PENDING
    }),
    __metadata("design:type", String)
], SignageContent.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], SignageContent.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SignageContent.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SignageContent.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", User_1.User)
], SignageContent.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SignageContent.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'approvedBy' }),
    __metadata("design:type", User_1.User)
], SignageContent.prototype, "approver", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SignageContent.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SignageContent.prototype, "rejectedReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SignageContent.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SignageContent.prototype, "updatedAt", void 0);
exports.SignageContent = SignageContent = __decorate([
    (0, typeorm_1.Entity)('signage_contents')
], SignageContent);
//# sourceMappingURL=SignageContent.js.map