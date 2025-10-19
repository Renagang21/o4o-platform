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
exports.ACFField = exports.ConditionalOperator = exports.ACFFieldType = void 0;
const typeorm_1 = require("typeorm");
const ACFFieldGroup_1 = require("./ACFFieldGroup");
var ACFFieldType;
(function (ACFFieldType) {
    // Basic
    ACFFieldType["TEXT"] = "text";
    ACFFieldType["TEXTAREA"] = "textarea";
    ACFFieldType["NUMBER"] = "number";
    ACFFieldType["EMAIL"] = "email";
    ACFFieldType["URL"] = "url";
    ACFFieldType["PASSWORD"] = "password";
    // Content
    ACFFieldType["WYSIWYG"] = "wysiwyg";
    ACFFieldType["OEMBED"] = "oembed";
    ACFFieldType["IMAGE"] = "image";
    ACFFieldType["FILE"] = "file";
    ACFFieldType["GALLERY"] = "gallery";
    // Choice
    ACFFieldType["SELECT"] = "select";
    ACFFieldType["CHECKBOX"] = "checkbox";
    ACFFieldType["RADIO"] = "radio";
    ACFFieldType["TRUE_FALSE"] = "true_false";
    ACFFieldType["BUTTON_GROUP"] = "button_group";
    // Relational
    ACFFieldType["POST_OBJECT"] = "post_object";
    ACFFieldType["PAGE_LINK"] = "page_link";
    ACFFieldType["RELATIONSHIP"] = "relationship";
    ACFFieldType["TAXONOMY"] = "taxonomy";
    ACFFieldType["USER"] = "user";
    // jQuery
    ACFFieldType["COLOR_PICKER"] = "color_picker";
    ACFFieldType["DATE_PICKER"] = "date_picker";
    ACFFieldType["DATE_TIME_PICKER"] = "date_time_picker";
    ACFFieldType["TIME_PICKER"] = "time_picker";
    ACFFieldType["GOOGLE_MAP"] = "google_map";
    // Layout
    ACFFieldType["TAB"] = "tab";
    ACFFieldType["GROUP"] = "group";
    ACFFieldType["REPEATER"] = "repeater";
    ACFFieldType["FLEXIBLE_CONTENT"] = "flexible_content";
    ACFFieldType["CLONE"] = "clone";
    ACFFieldType["MESSAGE"] = "message";
    ACFFieldType["ACCORDION"] = "accordion";
})(ACFFieldType || (exports.ACFFieldType = ACFFieldType = {}));
var ConditionalOperator;
(function (ConditionalOperator) {
    ConditionalOperator["EQUALS"] = "==";
    ConditionalOperator["NOT_EQUALS"] = "!=";
    ConditionalOperator["CONTAINS"] = "contains";
    ConditionalOperator["NOT_CONTAINS"] = "!contains";
    ConditionalOperator["EMPTY"] = "empty";
    ConditionalOperator["NOT_EMPTY"] = "!empty";
    ConditionalOperator["GREATER_THAN"] = ">";
    ConditionalOperator["LESS_THAN"] = "<";
    ConditionalOperator["PATTERN_MATCH"] = "pattern";
})(ConditionalOperator || (exports.ConditionalOperator = ConditionalOperator = {}));
let ACFField = class ACFField {
    // Helper methods
    generateKey() {
        if (!this.key) {
            // Generate a unique key based on name
            const base = this.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            this.key = `field_${base}_${Date.now()}`;
        }
        return this.key;
    }
    validateValue(value) {
        if (!this.validation)
            return true;
        if (this.validation.required && !value) {
            return false;
        }
        if (this.type === ACFFieldType.NUMBER) {
            const num = Number(value);
            if (this.validation.min !== undefined && num < this.validation.min)
                return false;
            if (this.validation.max !== undefined && num > this.validation.max)
                return false;
        }
        if (this.type === ACFFieldType.TEXT || this.type === ACFFieldType.TEXTAREA) {
            const str = String(value);
            if (this.validation.minLength && str.length < this.validation.minLength)
                return false;
            if (this.validation.maxLength && str.length > this.validation.maxLength)
                return false;
            if (this.validation.pattern && !new RegExp(this.validation.pattern).test(str))
                return false;
        }
        if (this.type === ACFFieldType.EMAIL && this.validation.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value)))
                return false;
        }
        if (this.type === ACFFieldType.URL && this.validation.url) {
            try {
                new URL(String(value));
            }
            catch (_a) {
                return false;
            }
        }
        return true;
    }
    checkConditionalLogic(fieldValues) {
        if (!this.conditionalLogic || !this.conditionalLogic.enabled) {
            return true; // Always show if no conditional logic
        }
        // OR logic between rule groups
        return this.conditionalLogic.rules.some(ruleGroup => {
            // AND logic within each group
            return ruleGroup.every(rule => {
                const fieldValue = fieldValues[rule.field];
                switch (rule.operator) {
                    case ConditionalOperator.EQUALS:
                        return fieldValue == rule.value;
                    case ConditionalOperator.NOT_EQUALS:
                        return fieldValue != rule.value;
                    case ConditionalOperator.CONTAINS:
                        return String(fieldValue).includes(String(rule.value));
                    case ConditionalOperator.NOT_CONTAINS:
                        return !String(fieldValue).includes(String(rule.value));
                    case ConditionalOperator.EMPTY:
                        return !fieldValue || fieldValue === '' || fieldValue.length === 0;
                    case ConditionalOperator.NOT_EMPTY:
                        return fieldValue && fieldValue !== '' && fieldValue.length !== 0;
                    case ConditionalOperator.GREATER_THAN:
                        return Number(fieldValue) > Number(rule.value);
                    case ConditionalOperator.LESS_THAN:
                        return Number(fieldValue) < Number(rule.value);
                    case ConditionalOperator.PATTERN_MATCH:
                        return new RegExp(String(rule.value)).test(String(fieldValue));
                    default:
                        return false;
                }
            });
        });
    }
    toJSON() {
        return {
            id: this.id,
            label: this.label,
            name: this.name,
            key: this.key,
            type: this.type,
            instructions: this.instructions,
            required: this.required,
            defaultValue: this.defaultValue,
            placeholder: this.placeholder,
            choices: this.choices,
            conditionalLogic: this.conditionalLogic,
            validation: this.validation,
            appearance: this.appearance,
            order: this.order,
            // Include type-specific fields
            ...(this.type === ACFFieldType.NUMBER && {
                min: this.min,
                max: this.max,
                step: this.step
            }),
            ...(this.type === ACFFieldType.TEXT && {
                minLength: this.minLength,
                maxLength: this.maxLength
            }),
            ...(this.type === ACFFieldType.REPEATER && {
                subFields: this.subFields,
                minRows: this.minRows,
                maxRows: this.maxRows,
                buttonLabel: this.buttonLabel
            })
        };
    }
};
exports.ACFField = ACFField;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ACFField.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ACFField.prototype, "fieldGroupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ACFFieldGroup_1.ACFFieldGroup, { onDelete: 'CASCADE', lazy: true }),
    (0, typeorm_1.JoinColumn)({ name: 'fieldGroupId' }),
    __metadata("design:type", Promise)
], ACFField.prototype, "fieldGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], ACFField.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], ACFField.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], ACFField.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ACFFieldType
    }),
    __metadata("design:type", String)
], ACFField.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "instructions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "required", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "defaultValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "placeholder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "prependText", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "appendText", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ACFField.prototype, "choices", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "allowNull", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "multiple", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "allowCustom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "layout", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "min", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "max", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "step", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "minLength", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "maxLength", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "rows", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "newLines", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "returnFormat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "previewSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "library", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "minWidth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "minHeight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "maxWidth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "maxHeight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "minSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "maxSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ACFField.prototype, "mimeTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "tabs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'all' }),
    __metadata("design:type", String)
], ACFField.prototype, "toolbar", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "mediaUpload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "displayFormat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "returnDateFormat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "firstDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ACFField.prototype, "postTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ACFField.prototype, "taxonomies", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ACFField.prototype, "filters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "minPosts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "maxPosts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ACFField.prototype, "subFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ACFField.prototype, "buttonLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "minRows", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ACFField.prototype, "maxRows", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'table' }),
    __metadata("design:type", String)
], ACFField.prototype, "repeaterLayout", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ACFField.prototype, "layouts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ACFField.prototype, "cloneFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'seamless' }),
    __metadata("design:type", String)
], ACFField.prototype, "cloneDisplay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "prefixLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ACFField.prototype, "prefixName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ACFField.prototype, "conditionalLogic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ACFField.prototype, "validation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ACFField.prototype, "appearance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ACFField.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ACFField.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ACFField.prototype, "updatedAt", void 0);
exports.ACFField = ACFField = __decorate([
    (0, typeorm_1.Entity)('acf_fields'),
    (0, typeorm_1.Index)(['fieldGroupId', 'order']),
    (0, typeorm_1.Index)(['key'], { unique: true }),
    (0, typeorm_1.Index)(['name']),
    (0, typeorm_1.Index)(['type'])
], ACFField);
//# sourceMappingURL=ACFField.js.map