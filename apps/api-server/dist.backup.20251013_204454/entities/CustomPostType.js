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
exports.CustomPostType = void 0;
const typeorm_1 = require("typeorm");
let CustomPostType = class CustomPostType {
};
exports.CustomPostType = CustomPostType;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomPostType.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], CustomPostType.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], CustomPostType.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CustomPostType.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'file' }),
    __metadata("design:type", String)
], CustomPostType.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], CustomPostType.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'public' }),
    __metadata("design:type", Boolean)
], CustomPostType.prototype, "public", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'has_archive' }),
    __metadata("design:type", Boolean)
], CustomPostType.prototype, "hasArchive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'show_in_menu' }),
    __metadata("design:type", Boolean)
], CustomPostType.prototype, "showInMenu", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '["title", "editor"]' }),
    __metadata("design:type", Array)
], CustomPostType.prototype, "supports", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '[]' }),
    __metadata("design:type", Array)
], CustomPostType.prototype, "taxonomies", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], CustomPostType.prototype, "labels", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, name: 'menu_position' }),
    __metadata("design:type", Number)
], CustomPostType.prototype, "menuPosition", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'post', name: 'capability_type' }),
    __metadata("design:type", String)
], CustomPostType.prototype, "capabilityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], CustomPostType.prototype, "rewrite", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('CustomPost', 'postType'),
    __metadata("design:type", Array)
], CustomPostType.prototype, "posts", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomPostType.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomPostType.prototype, "updatedAt", void 0);
exports.CustomPostType = CustomPostType = __decorate([
    (0, typeorm_1.Entity)('custom_post_types')
], CustomPostType);
//# sourceMappingURL=CustomPostType.js.map