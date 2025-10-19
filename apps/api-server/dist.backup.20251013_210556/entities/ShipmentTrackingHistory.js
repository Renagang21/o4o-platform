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
exports.ShipmentTrackingHistory = void 0;
const typeorm_1 = require("typeorm");
const Shipment_1 = require("./Shipment");
let ShipmentTrackingHistory = class ShipmentTrackingHistory {
};
exports.ShipmentTrackingHistory = ShipmentTrackingHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ShipmentTrackingHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipment_id' }),
    __metadata("design:type", Number)
], ShipmentTrackingHistory.prototype, "shipmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Shipment_1.Shipment),
    (0, typeorm_1.JoinColumn)({ name: 'shipment_id' }),
    __metadata("design:type", Shipment_1.Shipment)
], ShipmentTrackingHistory.prototype, "shipment", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ShipmentTrackingHistory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ShipmentTrackingHistory.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ShipmentTrackingHistory.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tracking_time', type: 'timestamp' }),
    __metadata("design:type", Date)
], ShipmentTrackingHistory.prototype, "trackingTime", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ShipmentTrackingHistory.prototype, "createdAt", void 0);
exports.ShipmentTrackingHistory = ShipmentTrackingHistory = __decorate([
    (0, typeorm_1.Entity)('shipment_tracking_history')
], ShipmentTrackingHistory);
//# sourceMappingURL=ShipmentTrackingHistory.js.map