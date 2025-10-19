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
exports.PageRevision = void 0;
const typeorm_1 = require("typeorm");
const Page_1 = require("./Page");
const User_1 = require("./User");
let PageRevision = class PageRevision {
    // Helper method to create diff summary
    getDiffSummary() {
        if (!this.changes)
            return 'No changes recorded';
        const summaryParts = [];
        if (this.changes.title) {
            summaryParts.push('title updated');
        }
        if (this.changes.content) {
            summaryParts.push('content modified');
        }
        if (this.changes.status) {
            summaryParts.push(`status changed to ${this.changes.status.to}`);
        }
        if (this.changes.parentId) {
            summaryParts.push('parent page changed');
        }
        if (this.changes.menuOrder) {
            summaryParts.push('menu order updated');
        }
        return summaryParts.length > 0
            ? summaryParts.join(', ')
            : 'Minor changes';
    }
    // Helper method to check if this revision represents a structural change
    isStructuralChange() {
        if (!this.changes)
            return false;
        return !!(this.changes.parentId ||
            this.changes.menuOrder ||
            this.changes.showInMenu ||
            this.changes.template);
    }
};
exports.PageRevision = PageRevision;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PageRevision.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PageRevision.prototype, "pageId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Page_1.Page, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pageId' }),
    __metadata("design:type", Page_1.Page)
], PageRevision.prototype, "page", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PageRevision.prototype, "revisionNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PageRevision.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'authorId' }),
    __metadata("design:type", User_1.User)
], PageRevision.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PageRevision.prototype, "revisionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PageRevision.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], PageRevision.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PageRevision.prototype, "excerpt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PageRevision.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], PageRevision.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PageRevision.prototype, "menuOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean' }),
    __metadata("design:type", Boolean)
], PageRevision.prototype, "showInMenu", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], PageRevision.prototype, "template", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PageRevision.prototype, "seo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PageRevision.prototype, "customFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PageRevision.prototype, "changes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PageRevision.prototype, "changeDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PageRevision.prototype, "isRestorePoint", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", String)
], PageRevision.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PageRevision.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PageRevision.prototype, "createdAt", void 0);
exports.PageRevision = PageRevision = __decorate([
    (0, typeorm_1.Entity)('page_revisions'),
    (0, typeorm_1.Index)(['pageId', 'createdAt']),
    (0, typeorm_1.Index)(['pageId', 'revisionNumber'])
], PageRevision);
//# sourceMappingURL=PageRevision.js.map