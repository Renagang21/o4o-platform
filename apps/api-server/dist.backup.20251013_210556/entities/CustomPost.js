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
exports.CustomPost = exports.PostStatus = void 0;
const typeorm_1 = require("typeorm");
const CustomPostType_1 = require("./CustomPostType");
var PostStatus;
(function (PostStatus) {
    PostStatus["DRAFT"] = "draft";
    PostStatus["PUBLISHED"] = "publish";
    PostStatus["PRIVATE"] = "private";
    PostStatus["TRASH"] = "trash";
})(PostStatus || (exports.PostStatus = PostStatus = {}));
let CustomPost = class CustomPost {
    // Helper method to get field value with type safety
    getField(fieldName) {
        return this.fields[fieldName];
    }
    // Helper method to set field value
    setField(fieldName, value) {
        this.fields = { ...this.fields, [fieldName]: value };
    }
    // Generate slug from title
    generateSlug() {
        return this.title
            .toLowerCase()
            .replace(/[^a-z0-9가-힣\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
};
exports.CustomPost = CustomPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], CustomPost.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, unique: true }),
    __metadata("design:type", String)
], CustomPost.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'cpt_slug' }),
    __metadata("design:type", String)
], CustomPost.prototype, "postTypeSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PostStatus,
        default: PostStatus.DRAFT
    }),
    __metadata("design:type", String)
], CustomPost.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: {} }),
    __metadata("design:type", Object)
], CustomPost.prototype, "fields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CustomPost.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], CustomPost.prototype, "meta", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], CustomPost.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CustomPost.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CustomPost.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => CustomPostType_1.CustomPostType, cpt => cpt.posts),
    (0, typeorm_1.JoinColumn)({ name: 'postTypeSlug', referencedColumnName: 'slug' }),
    __metadata("design:type", CustomPostType_1.CustomPostType)
], CustomPost.prototype, "postType", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomPost.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomPost.prototype, "updatedAt", void 0);
exports.CustomPost = CustomPost = __decorate([
    (0, typeorm_1.Entity)('custom_posts'),
    (0, typeorm_1.Index)(['postTypeSlug', 'status']),
    (0, typeorm_1.Index)(['slug'])
], CustomPost);
//# sourceMappingURL=CustomPost.js.map