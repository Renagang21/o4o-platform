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
exports.TermRelationship = exports.Term = exports.Taxonomy = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
let Taxonomy = class Taxonomy {
};
exports.Taxonomy = Taxonomy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Taxonomy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 32 }),
    __metadata("design:type", String)
], Taxonomy.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Taxonomy.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Taxonomy.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Taxonomy.prototype, "objectTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Taxonomy.prototype, "labels", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Taxonomy.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "hierarchical", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "public", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "showUI", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "showInMenu", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "showInNavMenus", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "showTagcloud", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "showInQuickEdit", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Taxonomy.prototype, "showAdminColumn", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Taxonomy.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Taxonomy.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", User_1.User)
], Taxonomy.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Taxonomy.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Taxonomy.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Term, term => term.taxonomy),
    __metadata("design:type", Array)
], Taxonomy.prototype, "terms", void 0);
exports.Taxonomy = Taxonomy = __decorate([
    (0, typeorm_1.Entity)('taxonomies')
], Taxonomy);
let Term = class Term {
    // Computed properties
    get level() {
        return this.parent ? 1 : 0; // Can be computed from materialized path
    }
    get fullPath() {
        return this.parent ? `${this.parent.fullPath}/${this.slug}` : this.slug;
    }
};
exports.Term = Term;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Term.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Term.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, unique: true }),
    __metadata("design:type", String)
], Term.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Term.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Term.prototype, "count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Term.prototype, "taxonomyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Taxonomy, taxonomy => taxonomy.terms, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'taxonomyId' }),
    __metadata("design:type", Taxonomy)
], Term.prototype, "taxonomy", void 0);
__decorate([
    (0, typeorm_1.TreeParent)(),
    __metadata("design:type", Term)
], Term.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.TreeChildren)(),
    __metadata("design:type", Array)
], Term.prototype, "children", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Term.prototype, "meta", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Term.prototype, "termOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Term.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Term.prototype, "updatedAt", void 0);
exports.Term = Term = __decorate([
    (0, typeorm_1.Entity)('terms'),
    (0, typeorm_1.Tree)('materialized-path')
], Term);
let TermRelationship = class TermRelationship {
};
exports.TermRelationship = TermRelationship;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TermRelationship.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TermRelationship.prototype, "objectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], TermRelationship.prototype, "objectType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TermRelationship.prototype, "termId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Term, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'termId' }),
    __metadata("design:type", Term)
], TermRelationship.prototype, "term", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], TermRelationship.prototype, "termOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TermRelationship.prototype, "createdAt", void 0);
exports.TermRelationship = TermRelationship = __decorate([
    (0, typeorm_1.Entity)('term_relationships')
], TermRelationship);
//# sourceMappingURL=Taxonomy.js.map