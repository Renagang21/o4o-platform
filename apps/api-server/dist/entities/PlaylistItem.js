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
exports.PlaylistItem = exports.ItemType = void 0;
const typeorm_1 = require("typeorm");
const StorePlaylist_1 = require("./StorePlaylist");
const SignageContent_1 = require("./SignageContent");
var ItemType;
(function (ItemType) {
    ItemType["VIDEO"] = "video";
    ItemType["IMAGE"] = "image";
})(ItemType || (exports.ItemType = ItemType = {}));
let PlaylistItem = class PlaylistItem {
    // Business logic methods
    isVideo() {
        return this.type === ItemType.VIDEO && !!this.contentId;
    }
    isImage() {
        return this.type === ItemType.IMAGE && !!this.imageUrl;
    }
    getDisplayDuration() {
        var _a, _b;
        if (this.isVideo() && this.content) {
            const startTime = ((_a = this.customSettings) === null || _a === void 0 ? void 0 : _a.startTime) || 0;
            const endTime = ((_b = this.customSettings) === null || _b === void 0 ? void 0 : _b.endTime) || this.content.duration || 0;
            return endTime - startTime;
        }
        return this.duration || 30; // Default 30 seconds for images
    }
};
exports.PlaylistItem = PlaylistItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PlaylistItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ItemType,
        default: ItemType.VIDEO
    }),
    __metadata("design:type", String)
], PlaylistItem.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PlaylistItem.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], PlaylistItem.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PlaylistItem.prototype, "customSettings", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PlaylistItem.prototype, "playlistId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StorePlaylist_1.StorePlaylist, playlist => playlist.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'playlistId' }),
    __metadata("design:type", StorePlaylist_1.StorePlaylist)
], PlaylistItem.prototype, "playlist", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PlaylistItem.prototype, "contentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SignageContent_1.SignageContent, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'contentId' }),
    __metadata("design:type", SignageContent_1.SignageContent)
], PlaylistItem.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PlaylistItem.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PlaylistItem.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PlaylistItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PlaylistItem.prototype, "updatedAt", void 0);
exports.PlaylistItem = PlaylistItem = __decorate([
    (0, typeorm_1.Entity)('playlist_items')
], PlaylistItem);
//# sourceMappingURL=PlaylistItem.js.map