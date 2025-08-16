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
exports.Shipment = void 0;
const typeorm_1 = require("typeorm");
const Order_1 = require("./Order");
let Shipment = class Shipment {
};
exports.Shipment = Shipment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Shipment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id' }),
    __metadata("design:type", Number)
], Shipment.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order_1.Order),
    (0, typeorm_1.JoinColumn)({ name: 'order_id' }),
    __metadata("design:type", Order_1.Order)
], Shipment.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tracking_number', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "trackingNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Shipment.prototype, "carrier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'carrier_code', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "carrierCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
        default: 'pending'
    }),
    __metadata("design:type", String)
], Shipment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipped_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Shipment.prototype, "shippedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Shipment.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_delivery_date', type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Shipment.prototype, "expectedDeliveryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_name' }),
    __metadata("design:type", String)
], Shipment.prototype, "senderName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_phone' }),
    __metadata("design:type", String)
], Shipment.prototype, "senderPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_address', type: 'text' }),
    __metadata("design:type", String)
], Shipment.prototype, "senderAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_postal_code', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "senderPostalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_name' }),
    __metadata("design:type", String)
], Shipment.prototype, "recipientName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_phone' }),
    __metadata("design:type", String)
], Shipment.prototype, "recipientPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_address', type: 'text' }),
    __metadata("design:type", String)
], Shipment.prototype, "recipientAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_postal_code', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "recipientPostalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipping_cost', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Shipment.prototype, "shippingCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'insurance_amount', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Shipment.prototype, "insuranceAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Shipment.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Shipment.prototype, "dimensions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivery_message', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "deliveryMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signature_required', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Shipment.prototype, "signatureRequired", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signature_image', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "signatureImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "failedReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'return_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Shipment.prototype, "returnReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Shipment.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Shipment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Shipment.prototype, "updatedAt", void 0);
exports.Shipment = Shipment = __decorate([
    (0, typeorm_1.Entity)('shipments')
], Shipment);
//# sourceMappingURL=Shipment.js.map