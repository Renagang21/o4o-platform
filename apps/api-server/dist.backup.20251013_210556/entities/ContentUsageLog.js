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
exports.ContentUsageLog = exports.LogEventType = void 0;
const typeorm_1 = require("typeorm");
const Store_1 = require("./Store");
const SignageContent_1 = require("./SignageContent");
const StorePlaylist_1 = require("./StorePlaylist");
var LogEventType;
(function (LogEventType) {
    LogEventType["PLAY_START"] = "play_start";
    LogEventType["PLAY_END"] = "play_end";
    LogEventType["PLAY_PAUSE"] = "play_pause";
    LogEventType["PLAY_RESUME"] = "play_resume";
    LogEventType["PLAY_SKIP"] = "play_skip";
    LogEventType["SCHEDULE_CHANGE"] = "schedule_change";
    LogEventType["PLAYLIST_CHANGE"] = "playlist_change";
})(LogEventType || (exports.LogEventType = LogEventType = {}));
let ContentUsageLog = class ContentUsageLog {
    // Static helper methods for creating logs
    static createPlayLog(storeId, contentId, playlistId, eventType, duration, metadata) {
        return {
            storeId,
            contentId,
            playlistId,
            eventType,
            duration,
            metadata,
            timestamp: new Date()
        };
    }
    static createScheduleLog(storeId, eventType, metadata) {
        return {
            storeId,
            eventType,
            metadata,
            timestamp: new Date()
        };
    }
};
exports.ContentUsageLog = ContentUsageLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ContentUsageLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LogEventType
    }),
    __metadata("design:type", String)
], ContentUsageLog.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], ContentUsageLog.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ContentUsageLog.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ContentUsageLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ContentUsageLog.prototype, "storeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Store_1.Store),
    (0, typeorm_1.JoinColumn)({ name: 'storeId' }),
    __metadata("design:type", Store_1.Store)
], ContentUsageLog.prototype, "store", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContentUsageLog.prototype, "contentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SignageContent_1.SignageContent, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'contentId' }),
    __metadata("design:type", SignageContent_1.SignageContent)
], ContentUsageLog.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContentUsageLog.prototype, "playlistId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StorePlaylist_1.StorePlaylist, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'playlistId' }),
    __metadata("design:type", StorePlaylist_1.StorePlaylist)
], ContentUsageLog.prototype, "playlist", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ContentUsageLog.prototype, "createdAt", void 0);
exports.ContentUsageLog = ContentUsageLog = __decorate([
    (0, typeorm_1.Entity)('content_usage_logs')
], ContentUsageLog);
//# sourceMappingURL=ContentUsageLog.js.map