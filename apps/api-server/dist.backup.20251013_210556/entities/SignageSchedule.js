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
exports.SignageSchedule = exports.ScheduleStatus = exports.ScheduleType = void 0;
const typeorm_1 = require("typeorm");
const Store_1 = require("./Store");
const StorePlaylist_1 = require("./StorePlaylist");
var ScheduleType;
(function (ScheduleType) {
    ScheduleType["DAILY"] = "daily";
    ScheduleType["WEEKLY"] = "weekly";
    ScheduleType["ONE_TIME"] = "one_time";
})(ScheduleType || (exports.ScheduleType = ScheduleType = {}));
var ScheduleStatus;
(function (ScheduleStatus) {
    ScheduleStatus["ACTIVE"] = "active";
    ScheduleStatus["INACTIVE"] = "inactive";
    ScheduleStatus["EXPIRED"] = "expired";
})(ScheduleStatus || (exports.ScheduleStatus = ScheduleStatus = {}));
let SignageSchedule = class SignageSchedule {
    // Business logic methods
    isActiveNow() {
        var _a, _b;
        if (this.status !== ScheduleStatus.ACTIVE)
            return false;
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM
        const currentDay = now.getDay();
        const currentDate = now.toISOString().split('T')[0];
        // Check time range
        if (currentTime < this.startTime || currentTime > this.endTime) {
            return false;
        }
        // Check date validity
        if (this.validFrom && now < this.validFrom)
            return false;
        if (this.validUntil && now > this.validUntil)
            return false;
        // Check schedule type
        switch (this.type) {
            case ScheduleType.DAILY:
                return true;
            case ScheduleType.WEEKLY:
                return ((_a = this.daysOfWeek) === null || _a === void 0 ? void 0 : _a.includes(currentDay)) || false;
            case ScheduleType.ONE_TIME:
                return ((_b = this.specificDate) === null || _b === void 0 ? void 0 : _b.toISOString().split('T')[0]) === currentDate;
            default:
                return false;
        }
    }
    conflictsWith(other) {
        if (this.storeId !== other.storeId)
            return false;
        // Simple time overlap check (can be enhanced)
        return !(this.endTime <= other.startTime || this.startTime >= other.endTime);
    }
};
exports.SignageSchedule = SignageSchedule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SignageSchedule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SignageSchedule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SignageSchedule.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ScheduleType,
        default: ScheduleType.DAILY
    }),
    __metadata("design:type", String)
], SignageSchedule.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ScheduleStatus,
        default: ScheduleStatus.ACTIVE
    }),
    __metadata("design:type", String)
], SignageSchedule.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time' }),
    __metadata("design:type", String)
], SignageSchedule.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time' }),
    __metadata("design:type", String)
], SignageSchedule.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], SignageSchedule.prototype, "daysOfWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], SignageSchedule.prototype, "specificDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], SignageSchedule.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], SignageSchedule.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SignageSchedule.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SignageSchedule.prototype, "storeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Store_1.Store, { lazy: true }),
    (0, typeorm_1.JoinColumn)({ name: 'storeId' }),
    __metadata("design:type", Promise)
], SignageSchedule.prototype, "store", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SignageSchedule.prototype, "playlistId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StorePlaylist_1.StorePlaylist),
    (0, typeorm_1.JoinColumn)({ name: 'playlistId' }),
    __metadata("design:type", StorePlaylist_1.StorePlaylist)
], SignageSchedule.prototype, "playlist", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SignageSchedule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SignageSchedule.prototype, "updatedAt", void 0);
exports.SignageSchedule = SignageSchedule = __decorate([
    (0, typeorm_1.Entity)('signage_schedules')
], SignageSchedule);
//# sourceMappingURL=SignageSchedule.js.map