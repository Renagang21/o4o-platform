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
exports.ACFFieldGroup = exports.LabelPlacement = exports.StyleType = exports.PositionType = exports.LocationOperator = exports.LocationType = void 0;
const typeorm_1 = require("typeorm");
const ACFField_1 = require("./ACFField");
var LocationType;
(function (LocationType) {
    LocationType["POST_TYPE"] = "post_type";
    LocationType["PAGE_TEMPLATE"] = "page_template";
    LocationType["POST_CATEGORY"] = "post_category";
    LocationType["POST_TAXONOMY"] = "post_taxonomy";
    LocationType["POST_FORMAT"] = "post_format";
    LocationType["POST_STATUS"] = "post_status";
    LocationType["USER_FORM"] = "user_form";
    LocationType["USER_ROLE"] = "user_role";
    LocationType["OPTIONS_PAGE"] = "options_page";
    LocationType["MENU_ITEM"] = "menu_item";
    LocationType["COMMENT"] = "comment";
    LocationType["WIDGET"] = "widget";
    LocationType["BLOCK"] = "block";
})(LocationType || (exports.LocationType = LocationType = {}));
var LocationOperator;
(function (LocationOperator) {
    LocationOperator["EQUALS"] = "==";
    LocationOperator["NOT_EQUALS"] = "!=";
    LocationOperator["CONTAINS"] = "contains";
    LocationOperator["NOT_CONTAINS"] = "!contains";
})(LocationOperator || (exports.LocationOperator = LocationOperator = {}));
var PositionType;
(function (PositionType) {
    PositionType["NORMAL"] = "normal";
    PositionType["SIDE"] = "side";
    PositionType["ACF_AFTER_TITLE"] = "acf_after_title";
})(PositionType || (exports.PositionType = PositionType = {}));
var StyleType;
(function (StyleType) {
    StyleType["DEFAULT"] = "default";
    StyleType["SEAMLESS"] = "seamless";
})(StyleType || (exports.StyleType = StyleType = {}));
var LabelPlacement;
(function (LabelPlacement) {
    LabelPlacement["TOP"] = "top";
    LabelPlacement["LEFT"] = "left";
})(LabelPlacement || (exports.LabelPlacement = LabelPlacement = {}));
let ACFFieldGroup = class ACFFieldGroup {
    // Helper methods
    generateKey() {
        if (!this.key) {
            // Generate a unique key based on title
            const base = this.title
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            this.key = `group_${base}_${Date.now()}`;
        }
        return this.key;
    }
    matchesLocation(context) {
        // Check if any location group matches (OR logic between groups)
        return this.location.some(group => {
            // All rules in a group must match (AND logic within group)
            return group.rules.every(rule => {
                switch (rule.param) {
                    case LocationType.POST_TYPE:
                        if (rule.operator === LocationOperator.EQUALS) {
                            return context.postType === rule.value;
                        }
                        else if (rule.operator === LocationOperator.NOT_EQUALS) {
                            return context.postType !== rule.value;
                        }
                        break;
                    case LocationType.PAGE_TEMPLATE:
                        if (rule.operator === LocationOperator.EQUALS) {
                            return context.pageTemplate === rule.value;
                        }
                        else if (rule.operator === LocationOperator.NOT_EQUALS) {
                            return context.pageTemplate !== rule.value;
                        }
                        break;
                    case LocationType.USER_ROLE:
                        if (rule.operator === LocationOperator.EQUALS) {
                            return context.userRole === rule.value;
                        }
                        else if (rule.operator === LocationOperator.NOT_EQUALS) {
                            return context.userRole !== rule.value;
                        }
                        break;
                    case LocationType.BLOCK:
                        if (rule.operator === LocationOperator.EQUALS) {
                            return context.block === rule.value;
                        }
                        else if (rule.operator === LocationOperator.NOT_EQUALS) {
                            return context.block !== rule.value;
                        }
                        break;
                    // Add more location type checks as needed
                }
                return false;
            });
        });
    }
    clone() {
        const cloned = {
            title: `${this.title} (Copy)`,
            description: this.description,
            location: JSON.parse(JSON.stringify(this.location)),
            position: this.position,
            style: this.style,
            labelPlacement: this.labelPlacement,
            hideOnScreen: this.hideOnScreen ? [...this.hideOnScreen] : undefined,
            isActive: false, // Start as inactive
            menuOrder: this.menuOrder,
            instructionPlacement: this.instructionPlacement,
            wpPostType: this.wpPostType,
            wpMeta: this.wpMeta ? { ...this.wpMeta } : undefined
        };
        return cloned;
    }
    toJSON() {
        var _a;
        return {
            id: this.id,
            title: this.title,
            key: this.key,
            description: this.description,
            location: this.location,
            position: this.position,
            style: this.style,
            labelPlacement: this.labelPlacement,
            hideOnScreen: this.hideOnScreen,
            isActive: this.isActive,
            menuOrder: this.menuOrder,
            instructionPlacement: this.instructionPlacement,
            fields: (_a = this.fields) === null || _a === void 0 ? void 0 : _a.map(field => field.toJSON()),
            wpPostType: this.wpPostType,
            version: this.version,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
};
exports.ACFFieldGroup = ACFFieldGroup;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Array)
], ACFFieldGroup.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PositionType,
        default: PositionType.NORMAL
    }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: StyleType,
        default: StyleType.DEFAULT
    }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "style", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LabelPlacement,
        default: LabelPlacement.TOP
    }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "labelPlacement", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ACFFieldGroup.prototype, "hideOnScreen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ACFFieldGroup.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ACFFieldGroup.prototype, "menuOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFFieldGroup.prototype, "instructionPlacement", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "wpPostType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ACFFieldGroup.prototype, "wpMeta", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], ACFFieldGroup.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ACFFieldGroup.prototype, "changelog", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ACFFieldGroup.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ACFFieldGroup.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ACFFieldGroup.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ACFField_1.ACFField, field => field.fieldGroup),
    __metadata("design:type", Array)
], ACFFieldGroup.prototype, "fields", void 0);
exports.ACFFieldGroup = ACFFieldGroup = __decorate([
    (0, typeorm_1.Entity)('acf_field_groups'),
    (0, typeorm_1.Index)(['key'], { unique: true }),
    (0, typeorm_1.Index)(['isActive']),
    (0, typeorm_1.Index)(['menuOrder'])
], ACFFieldGroup);
//# sourceMappingURL=ACFFieldGroup.js.map