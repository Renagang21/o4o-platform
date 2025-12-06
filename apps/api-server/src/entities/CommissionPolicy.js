var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
/**
 * CommissionPolicy Entity
 *
 * Manages commission calculation rules with priority-based conflict resolution.
 * Supports multiple policy types: default, tier-based, product-specific, category-based, promotional.
 */
export var PolicyType;
(function (PolicyType) {
    PolicyType["DEFAULT"] = "default";
    PolicyType["TIER_BASED"] = "tier_based";
    PolicyType["PRODUCT_SPECIFIC"] = "product_specific";
    PolicyType["CATEGORY"] = "category";
    PolicyType["PROMOTIONAL"] = "promotional";
    PolicyType["PARTNER_SPECIFIC"] = "partner_specific"; // Individual partner negotiation
})(PolicyType || (PolicyType = {}));
export var PolicyStatus;
(function (PolicyStatus) {
    PolicyStatus["ACTIVE"] = "active";
    PolicyStatus["INACTIVE"] = "inactive";
    PolicyStatus["SCHEDULED"] = "scheduled";
    PolicyStatus["EXPIRED"] = "expired"; // Was active, now ended
})(PolicyStatus || (PolicyStatus = {}));
export var CommissionType;
(function (CommissionType) {
    CommissionType["PERCENTAGE"] = "percentage";
    CommissionType["FIXED"] = "fixed";
    CommissionType["TIERED"] = "tiered"; // Different rates based on volume
})(CommissionType || (CommissionType = {}));
let CommissionPolicy = class CommissionPolicy {
    id;
    // Policy identification
    policyCode; // e.g., "DEFAULT-2025", "TIER-GOLD", "PROMO-SUMMER2025"
    name;
    description;
    // Policy type and status
    policyType;
    status;
    // Priority (higher number = higher priority, used for conflict resolution)
    priority;
    // Scope filters (null means "applies to all")
    partnerId; // Specific partner (for partner_specific type)
    partnerTier; // bronze, silver, gold, platinum
    productId; // Specific product
    supplierId; // All products from specific supplier
    category; // Product category
    tags; // Product tags
    // Commission structure
    commissionType;
    // For percentage type
    commissionRate; // e.g., 10.50 for 10.5%
    // For fixed type
    commissionAmount; // Fixed amount in KRW
    // For tiered type
    tieredRates;
    // Minimum/maximum commission constraints
    minCommission;
    maxCommission;
    // Validity period
    validFrom;
    validUntil;
    // Conditions
    minOrderAmount; // Minimum order value to qualify
    maxOrderAmount; // Maximum order value (for promotional rates)
    requiresNewCustomer; // Only for new customers
    excludeDiscountedItems; // Don't apply to discounted products
    // Usage limits (for promotional policies)
    maxUsagePerPartner;
    maxUsageTotal;
    currentUsageCount;
    // Stacking rules
    canStackWithOtherPolicies;
    exclusiveWith; // Policy codes that cannot be combined
    // Additional metadata
    metadata;
    // Approval workflow
    requiresApproval;
    createdBy;
    approvedBy;
    approvedAt;
    // Audit fields
    createdAt;
    updatedAt;
    // Helper methods
    isActive() {
        if (this.status !== PolicyStatus.ACTIVE) {
            return false;
        }
        const now = new Date();
        if (this.validFrom && now < this.validFrom) {
            return false;
        }
        if (this.validUntil && now > this.validUntil) {
            return false;
        }
        if (this.maxUsageTotal && this.currentUsageCount >= this.maxUsageTotal) {
            return false;
        }
        return true;
    }
    calculateCommission(orderAmount, quantity = 1) {
        let commission = 0;
        switch (this.commissionType) {
            case CommissionType.PERCENTAGE:
                if (this.commissionRate) {
                    commission = (orderAmount * this.commissionRate) / 100;
                }
                break;
            case CommissionType.FIXED:
                if (this.commissionAmount) {
                    commission = this.commissionAmount * quantity;
                }
                break;
            case CommissionType.TIERED:
                if (this.tieredRates) {
                    const tier = this.tieredRates.find(t => orderAmount >= t.minAmount && (!t.maxAmount || orderAmount <= t.maxAmount));
                    if (tier) {
                        commission = tier.rate
                            ? (orderAmount * tier.rate) / 100
                            : (tier.amount || 0) * quantity;
                    }
                }
                break;
        }
        // Apply min/max constraints
        if (this.minCommission && commission < this.minCommission) {
            commission = this.minCommission;
        }
        if (this.maxCommission && commission > this.maxCommission) {
            commission = this.maxCommission;
        }
        return Math.round(commission * 100) / 100; // Round to 2 decimal places
    }
    appliesTo(context) {
        // Check partner match
        if (this.partnerId && this.partnerId !== context.partnerId) {
            return false;
        }
        if (this.partnerTier && this.partnerTier !== context.partnerTier) {
            return false;
        }
        // Check product match
        if (this.productId && this.productId !== context.productId) {
            return false;
        }
        if (this.supplierId && this.supplierId !== context.supplierId) {
            return false;
        }
        if (this.category && this.category !== context.category) {
            return false;
        }
        // Check tags overlap
        if (this.tags && context.tags) {
            const hasMatchingTag = this.tags.some(tag => context.tags.includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }
        // Check order amount conditions
        if (this.minOrderAmount && context.orderAmount && context.orderAmount < this.minOrderAmount) {
            return false;
        }
        if (this.maxOrderAmount && context.orderAmount && context.orderAmount > this.maxOrderAmount) {
            return false;
        }
        // Check new customer requirement
        if (this.requiresNewCustomer && !context.isNewCustomer) {
            return false;
        }
        return true;
    }
    incrementUsage() {
        this.currentUsageCount += 1;
        // Auto-expire if hit max usage
        if (this.maxUsageTotal && this.currentUsageCount >= this.maxUsageTotal) {
            this.status = PolicyStatus.EXPIRED;
        }
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "policyCode", void 0);
__decorate([
    Column({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "name", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "description", void 0);
__decorate([
    Column({ type: 'enum', enum: PolicyType }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "policyType", void 0);
__decorate([
    Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.ACTIVE }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "status", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "priority", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "partnerId", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "partnerTier", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "productId", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "supplierId", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "category", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], CommissionPolicy.prototype, "tags", void 0);
__decorate([
    Column({ type: 'enum', enum: CommissionType, default: CommissionType.PERCENTAGE }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "commissionType", void 0);
__decorate([
    Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "commissionRate", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "commissionAmount", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], CommissionPolicy.prototype, "tieredRates", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "minCommission", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "maxCommission", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CommissionPolicy.prototype, "validFrom", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CommissionPolicy.prototype, "validUntil", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "minOrderAmount", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "maxOrderAmount", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CommissionPolicy.prototype, "requiresNewCustomer", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CommissionPolicy.prototype, "excludeDiscountedItems", void 0);
__decorate([
    Column({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "maxUsagePerPartner", void 0);
__decorate([
    Column({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "maxUsageTotal", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], CommissionPolicy.prototype, "currentUsageCount", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CommissionPolicy.prototype, "canStackWithOtherPolicies", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], CommissionPolicy.prototype, "exclusiveWith", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], CommissionPolicy.prototype, "metadata", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CommissionPolicy.prototype, "requiresApproval", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "createdBy", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], CommissionPolicy.prototype, "approvedBy", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CommissionPolicy.prototype, "approvedAt", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], CommissionPolicy.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], CommissionPolicy.prototype, "updatedAt", void 0);
CommissionPolicy = __decorate([
    Entity('commission_policies'),
    Index(['policyType', 'status']),
    Index(['partnerId', 'status']),
    Index(['productId', 'status']),
    Index(['category', 'status']),
    Index(['priority', 'status']),
    Index(['validFrom', 'validUntil'])
], CommissionPolicy);
export { CommissionPolicy };
