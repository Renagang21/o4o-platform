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
exports.BusinessInfo = exports.Industry = exports.BusinessSize = exports.BusinessType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var BusinessType;
(function (BusinessType) {
    BusinessType["SOLE_PROPRIETORSHIP"] = "sole_proprietorship";
    BusinessType["PARTNERSHIP"] = "partnership";
    BusinessType["CORPORATION"] = "corporation";
    BusinessType["LLC"] = "llc";
    BusinessType["NON_PROFIT"] = "non_profit";
    BusinessType["OTHER"] = "other";
})(BusinessType || (exports.BusinessType = BusinessType = {}));
var BusinessSize;
(function (BusinessSize) {
    BusinessSize["MICRO"] = "micro";
    BusinessSize["SMALL"] = "small";
    BusinessSize["MEDIUM"] = "medium";
    BusinessSize["LARGE"] = "large";
    BusinessSize["ENTERPRISE"] = "enterprise"; // 1000+ employees
})(BusinessSize || (exports.BusinessSize = BusinessSize = {}));
var Industry;
(function (Industry) {
    Industry["TECHNOLOGY"] = "technology";
    Industry["HEALTHCARE"] = "healthcare";
    Industry["FINANCE"] = "finance";
    Industry["RETAIL"] = "retail";
    Industry["MANUFACTURING"] = "manufacturing";
    Industry["EDUCATION"] = "education";
    Industry["REAL_ESTATE"] = "real_estate";
    Industry["HOSPITALITY"] = "hospitality";
    Industry["CONSULTING"] = "consulting";
    Industry["MARKETING"] = "marketing";
    Industry["CONSTRUCTION"] = "construction";
    Industry["AGRICULTURE"] = "agriculture";
    Industry["ENTERTAINMENT"] = "entertainment";
    Industry["TRANSPORTATION"] = "transportation";
    Industry["ENERGY"] = "energy";
    Industry["TELECOMMUNICATIONS"] = "telecommunications";
    Industry["AUTOMOTIVE"] = "automotive";
    Industry["AEROSPACE"] = "aerospace";
    Industry["PHARMACEUTICAL"] = "pharmaceutical";
    Industry["FOOD_BEVERAGE"] = "food_beverage";
    Industry["OTHER"] = "other";
})(Industry || (exports.Industry = Industry = {}));
let BusinessInfo = class BusinessInfo {
    // Helper methods
    getFullBusinessName() {
        if (this.tradingName && this.tradingName !== this.businessName) {
            return `${this.businessName} (${this.tradingName})`;
        }
        return this.businessName;
    }
    getFormattedAddress() {
        const addr = this.address;
        const parts = [
            addr.street1,
            addr.street2,
            addr.city,
            addr.state,
            addr.postalCode,
            addr.country
        ].filter(Boolean);
        return parts.join(', ');
    }
    getBusinessTypeDisplayName() {
        const typeNames = {
            [BusinessType.SOLE_PROPRIETORSHIP]: 'Sole Proprietorship',
            [BusinessType.PARTNERSHIP]: 'Partnership',
            [BusinessType.CORPORATION]: 'Corporation',
            [BusinessType.LLC]: 'Limited Liability Company',
            [BusinessType.NON_PROFIT]: 'Non-Profit Organization',
            [BusinessType.OTHER]: 'Other'
        };
        return typeNames[this.businessType];
    }
    getIndustryDisplayName() {
        const industryNames = {
            [Industry.TECHNOLOGY]: 'Technology',
            [Industry.HEALTHCARE]: 'Healthcare',
            [Industry.FINANCE]: 'Finance',
            [Industry.RETAIL]: 'Retail',
            [Industry.MANUFACTURING]: 'Manufacturing',
            [Industry.EDUCATION]: 'Education',
            [Industry.REAL_ESTATE]: 'Real Estate',
            [Industry.HOSPITALITY]: 'Hospitality',
            [Industry.CONSULTING]: 'Consulting',
            [Industry.MARKETING]: 'Marketing',
            [Industry.CONSTRUCTION]: 'Construction',
            [Industry.AGRICULTURE]: 'Agriculture',
            [Industry.ENTERTAINMENT]: 'Entertainment',
            [Industry.TRANSPORTATION]: 'Transportation',
            [Industry.ENERGY]: 'Energy',
            [Industry.TELECOMMUNICATIONS]: 'Telecommunications',
            [Industry.AUTOMOTIVE]: 'Automotive',
            [Industry.AEROSPACE]: 'Aerospace',
            [Industry.PHARMACEUTICAL]: 'Pharmaceutical',
            [Industry.FOOD_BEVERAGE]: 'Food & Beverage',
            [Industry.OTHER]: 'Other'
        };
        return industryNames[this.industry];
    }
    getBusinessSizeDisplayName() {
        if (!this.businessSize)
            return 'Unknown';
        const sizeNames = {
            [BusinessSize.MICRO]: 'Micro (1-9 employees)',
            [BusinessSize.SMALL]: 'Small (10-49 employees)',
            [BusinessSize.MEDIUM]: 'Medium (50-249 employees)',
            [BusinessSize.LARGE]: 'Large (250-999 employees)',
            [BusinessSize.ENTERPRISE]: 'Enterprise (1000+ employees)'
        };
        return sizeNames[this.businessSize];
    }
    isComplete() {
        var _a, _b, _c, _d;
        return !!(this.businessName &&
            this.businessType &&
            this.industry &&
            ((_a = this.address) === null || _a === void 0 ? void 0 : _a.street1) &&
            ((_b = this.address) === null || _b === void 0 ? void 0 : _b.city) &&
            ((_c = this.address) === null || _c === void 0 ? void 0 : _c.state) &&
            ((_d = this.address) === null || _d === void 0 ? void 0 : _d.country));
    }
    getCompletionPercentage() {
        const requiredFields = [
            'businessName',
            'businessType',
            'industry',
            'address.street1',
            'address.city',
            'address.state',
            'address.country'
        ];
        const optionalFields = [
            'tradingName',
            'description',
            'businessSize',
            'contact.phone',
            'contact.website',
            'contact.email',
            'financials.numberOfEmployees',
            'legal.taxId'
        ];
        let filledRequired = 0;
        let filledOptional = 0;
        // Check required fields
        requiredFields.forEach(field => {
            var _a;
            if (field.includes('.')) {
                const [parent, child] = field.split('.');
                if ((_a = this[parent]) === null || _a === void 0 ? void 0 : _a[child])
                    filledRequired++;
            }
            else {
                if (this[field])
                    filledRequired++;
            }
        });
        // Check optional fields
        optionalFields.forEach(field => {
            var _a;
            if (field.includes('.')) {
                const [parent, child] = field.split('.');
                if ((_a = this[parent]) === null || _a === void 0 ? void 0 : _a[child])
                    filledOptional++;
            }
            else {
                if (this[field])
                    filledOptional++;
            }
        });
        const totalFields = requiredFields.length + optionalFields.length;
        const totalFilled = filledRequired + filledOptional;
        return Math.round((totalFilled / totalFields) * 100);
    }
};
exports.BusinessInfo = BusinessInfo;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BusinessInfo.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_1.User, user => user.businessInfo, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], BusinessInfo.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "businessName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "tradingName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: BusinessType }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "businessType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: Industry }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "industry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: BusinessSize, nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "businessSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], BusinessInfo.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BusinessInfo.prototype, "billingAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BusinessInfo.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BusinessInfo.prototype, "financials", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BusinessInfo.prototype, "legal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BusinessInfo.prototype, "services", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BusinessInfo.prototype, "markets", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 5, nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BusinessInfo.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BusinessInfo.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "verifiedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BusinessInfo.prototype, "verificationNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BusinessInfo.prototype, "socialMedia", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BusinessInfo.prototype, "certifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BusinessInfo.prototype, "licenses", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BusinessInfo.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BusinessInfo.prototype, "updatedAt", void 0);
exports.BusinessInfo = BusinessInfo = __decorate([
    (0, typeorm_1.Entity)('business_info'),
    (0, typeorm_1.Index)(['userId'], { unique: true }),
    (0, typeorm_1.Index)(['businessType', 'industry']),
    (0, typeorm_1.Index)(['businessSize', 'industry'])
], BusinessInfo);
//# sourceMappingURL=BusinessInfo.js.map