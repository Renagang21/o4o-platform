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
exports.BlockPattern = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
let BlockPattern = class BlockPattern {
    // Virtual method to increment usage
    incrementUsage() {
        this.usageCount += 1;
        this.lastUsedAt = new Date();
    }
    // Virtual method to generate slug from title
    static generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    // Check if pattern is compatible with current environment
    isCompatible(blockTypes, plugins) {
        if (!this.dependencies || this.dependencies.length === 0) {
            return true;
        }
        // Check if all required blocks/plugins are available
        return this.dependencies.every(dep => blockTypes.includes(dep) || plugins.includes(dep));
    }
    // Generate preview HTML from pattern content
    generatePreviewHtml() {
        // Simplified preview generation
        // In real implementation, this would use WordPress block renderer
        const blocks = this.content.map(block => {
            const attrs = block.attributes ? JSON.stringify(block.attributes) : '';
            return `<div class="wp-block-${block.name}" data-attrs='${attrs}'>${block.innerHTML || ''}</div>`;
        }).join('\n');
        return `
      <div class="block-pattern-preview">
        ${blocks}
      </div>
    `;
    }
};
exports.BlockPattern = BlockPattern;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BlockPattern.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlockPattern.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 255 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlockPattern.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BlockPattern.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Array)
], BlockPattern.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['header', 'footer', 'hero', 'cta', 'features', 'testimonials', 'pricing', 'contact', 'about', 'gallery', 'posts', 'general'],
        default: 'general'
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlockPattern.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BlockPattern.prototype, "subcategories", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BlockPattern.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BlockPattern.prototype, "preview", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['core', 'theme', 'plugin', 'user'],
        default: 'user'
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlockPattern.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Boolean)
], BlockPattern.prototype, "featured", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], BlockPattern.prototype, "usageCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date
    // Pattern visibility
    )
], BlockPattern.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['public', 'private', 'pro'],
        default: 'public'
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlockPattern.prototype, "visibility", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], BlockPattern.prototype, "isPremium", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BlockPattern.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlockPattern.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'author_id' }),
    __metadata("design:type", User_1.User
    // Version control
    )
], BlockPattern.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '1.0.0' }),
    __metadata("design:type", String)
], BlockPattern.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BlockPattern.prototype, "dependencies", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BlockPattern.prototype, "colorScheme", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BlockPattern.prototype, "typography", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'draft', 'archived'],
        default: 'active'
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BlockPattern.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BlockPattern.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date
    // Virtual method to increment usage
    )
], BlockPattern.prototype, "updatedAt", void 0);
exports.BlockPattern = BlockPattern = __decorate([
    (0, typeorm_1.Entity)('block_patterns')
], BlockPattern);
//# sourceMappingURL=BlockPattern.js.map