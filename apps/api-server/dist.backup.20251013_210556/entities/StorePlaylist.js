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
exports.StorePlaylist = exports.PlaylistStatus = void 0;
const typeorm_1 = require("typeorm");
const Store_1 = require("./Store");
const PlaylistItem_1 = require("./PlaylistItem");
var PlaylistStatus;
(function (PlaylistStatus) {
    PlaylistStatus["ACTIVE"] = "active";
    PlaylistStatus["INACTIVE"] = "inactive";
    PlaylistStatus["SCHEDULED"] = "scheduled";
})(PlaylistStatus || (exports.PlaylistStatus = PlaylistStatus = {}));
let StorePlaylist = class StorePlaylist {
    // Business logic methods
    isActive() {
        return this.status === PlaylistStatus.ACTIVE;
    }
};
exports.StorePlaylist = StorePlaylist;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StorePlaylist.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StorePlaylist.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], StorePlaylist.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PlaylistStatus,
        default: PlaylistStatus.ACTIVE
    }),
    __metadata("design:type", String)
], StorePlaylist.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], StorePlaylist.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], StorePlaylist.prototype, "loop", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], StorePlaylist.prototype, "totalDuration", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StorePlaylist.prototype, "storeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Store_1.Store, { lazy: true }),
    (0, typeorm_1.JoinColumn)({ name: 'storeId' }),
    __metadata("design:type", Promise)
], StorePlaylist.prototype, "store", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PlaylistItem_1.PlaylistItem, item => item.playlist),
    __metadata("design:type", Array)
], StorePlaylist.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StorePlaylist.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StorePlaylist.prototype, "updatedAt", void 0);
exports.StorePlaylist = StorePlaylist = __decorate([
    (0, typeorm_1.Entity)('store_playlists')
], StorePlaylist);
//# sourceMappingURL=StorePlaylist.js.map