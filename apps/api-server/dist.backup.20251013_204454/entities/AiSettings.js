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
exports.AiSettings = void 0;
const typeorm_1 = require("typeorm");
let AiSettings = class AiSettings {
};
exports.AiSettings = AiSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AiSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AiSettings.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'apikey', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AiSettings.prototype, "apiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'defaultmodel', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], AiSettings.prototype, "defaultModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AiSettings.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'isactive', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], AiSettings.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'createdat' }),
    __metadata("design:type", Date)
], AiSettings.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updatedat' }),
    __metadata("design:type", Date)
], AiSettings.prototype, "updatedAt", void 0);
exports.AiSettings = AiSettings = __decorate([
    (0, typeorm_1.Entity)('ai_settings')
], AiSettings);
//# sourceMappingURL=AiSettings.js.map