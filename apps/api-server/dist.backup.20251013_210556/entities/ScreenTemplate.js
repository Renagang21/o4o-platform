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
exports.ScreenTemplate = exports.TemplateStatus = void 0;
const typeorm_1 = require("typeorm");
var TemplateStatus;
(function (TemplateStatus) {
    TemplateStatus["ACTIVE"] = "active";
    TemplateStatus["INACTIVE"] = "inactive";
})(TemplateStatus || (exports.TemplateStatus = TemplateStatus = {}));
let ScreenTemplate = class ScreenTemplate {
    // Business logic methods
    isActive() {
        return this.status === TemplateStatus.ACTIVE;
    }
    getMainZone() {
        return this.layout.zones.find((zone) => zone.isMain);
    }
    getSubZones() {
        return this.layout.zones.filter((zone) => !zone.isMain);
    }
    getZoneById(zoneId) {
        return this.layout.zones.find((zone) => zone.id === zoneId);
    }
};
exports.ScreenTemplate = ScreenTemplate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScreenTemplate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ScreenTemplate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ScreenTemplate.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], ScreenTemplate.prototype, "layout", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TemplateStatus,
        default: TemplateStatus.ACTIVE
    }),
    __metadata("design:type", String)
], ScreenTemplate.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ScreenTemplate.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ScreenTemplate.prototype, "previewImage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ScreenTemplate.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ScreenTemplate.prototype, "updatedAt", void 0);
exports.ScreenTemplate = ScreenTemplate = __decorate([
    (0, typeorm_1.Entity)('screen_templates')
], ScreenTemplate);
//# sourceMappingURL=ScreenTemplate.js.map