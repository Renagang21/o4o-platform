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
exports.PostRevision = void 0;
const typeorm_1 = require("typeorm");
const Post_1 = require("./Post");
const User_1 = require("./User");
let PostRevision = class PostRevision {
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
        if (this.changes.excerpt) {
            summaryParts.push('excerpt updated');
        }
        return summaryParts.length > 0
            ? summaryParts.join(', ')
            : 'Minor changes';
    }
    // Helper method to check if this revision represents a major change
    isMajorChange() {
        if (!this.changes)
            return false;
        return !!(this.changes.title ||
            this.changes.status ||
            (this.changes.content && this.isContentSignificantlyChanged()));
    }
    isContentSignificantlyChanged() {
        var _a;
        if (!((_a = this.changes) === null || _a === void 0 ? void 0 : _a.content))
            return false;
        const fromText = this.extractTextFromContent(this.changes.content.from);
        const toText = this.extractTextFromContent(this.changes.content.to);
        // Consider it significant if more than 10% of content changed
        const maxLength = Math.max(fromText.length, toText.length);
        const similarity = this.calculateSimilarity(fromText, toText);
        return similarity < 0.9 && maxLength > 100;
    }
    extractTextFromContent(content) {
        if (!content || !content.blocks)
            return '';
        return content.blocks
            .filter((block) => block.type === 'paragraph' || block.type === 'header')
            .map((block) => { var _a; return ((_a = block.data) === null || _a === void 0 ? void 0 : _a.text) || ''; })
            .join(' ');
    }
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[j][i] = matrix[j - 1][i - 1];
                }
                else {
                    matrix[j][i] = Math.min(matrix[j - 1][i - 1] + 1, matrix[j][i - 1] + 1, matrix[j - 1][i] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
};
exports.PostRevision = PostRevision;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PostRevision.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PostRevision.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Post_1.Post, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", Post_1.Post)
], PostRevision.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PostRevision.prototype, "revisionNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PostRevision.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'authorId' }),
    __metadata("design:type", User_1.User)
], PostRevision.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PostRevision.prototype, "revisionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PostRevision.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], PostRevision.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PostRevision.prototype, "excerpt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PostRevision.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PostRevision.prototype, "seo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PostRevision.prototype, "customFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], PostRevision.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PostRevision.prototype, "postMeta", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PostRevision.prototype, "changes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PostRevision.prototype, "changeDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PostRevision.prototype, "isRestorePoint", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], PostRevision.prototype, "wordCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", String)
], PostRevision.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PostRevision.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostRevision.prototype, "createdAt", void 0);
exports.PostRevision = PostRevision = __decorate([
    (0, typeorm_1.Entity)('post_revisions'),
    (0, typeorm_1.Index)(['postId', 'createdAt']),
    (0, typeorm_1.Index)(['postId', 'revisionNumber'])
], PostRevision);
//# sourceMappingURL=PostRevision.js.map