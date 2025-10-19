"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropshippingController = void 0;
const typeorm_1 = require("typeorm");
const Supplier_1 = require("../../entities/Supplier");
const Partner_1 = require("../../entities/Partner");
const PartnerCommission_1 = require("../../entities/PartnerCommission");
const Product_1 = require("../../entities/Product");
const ApprovalLog_1 = require("../../entities/ApprovalLog");
const User_1 = require("../../entities/User");
class DropshippingController {
    constructor() {
        // Commission Policies
        this.getCommissionPolicies = async (req, res) => {
            try {
                const supplierRepo = (0, typeorm_1.getRepository)(Supplier_1.Supplier);
                // Get suppliers with their commission policies
                const suppliers = await supplierRepo.find({
                    relations: ['user'],
                    where: { isActive: true }
                });
                const policies = suppliers.map(supplier => ({
                    id: supplier.id,
                    title: `${supplier.user.fullName || supplier.user.email} 커미션 정책`,
                    supplier: supplier.user.fullName || supplier.user.email,
                    partnerGrades: ['bronze', 'silver', 'gold', 'platinum'],
                    commissionRate: supplier.defaultPartnerCommissionRate,
                    minOrderAmount: 0,
                    startDate: supplier.createdAt.toISOString().split('T')[0],
                    status: supplier.isActive ? 'active' : 'inactive',
                    createdAt: supplier.createdAt.toISOString()
                }));
                res.json({
                    success: true,
                    policies
                });
            }
            catch (error) {
                console.error('Error fetching commission policies:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch commission policies'
                });
            }
        };
        // Approvals
        this.getApprovals = async (req, res) => {
            try {
                const approvalLogRepo = (0, typeorm_1.getRepository)(ApprovalLog_1.ApprovalLog);
                const approvals = await approvalLogRepo.find({
                    relations: ['user', 'admin'],
                    order: { created_at: 'DESC' },
                    take: 50
                });
                const mappedApprovals = approvals.map(log => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    return ({
                        id: log.id,
                        title: ((_a = log.metadata) === null || _a === void 0 ? void 0 : _a.title) || 'Approval Request',
                        type: ((_b = log.metadata) === null || _b === void 0 ? void 0 : _b.type) || 'general',
                        status: log.action === 'pending' ? 'pending' : log.action,
                        requestedBy: ((_c = log.user) === null || _c === void 0 ? void 0 : _c.fullName) || ((_d = log.user) === null || _d === void 0 ? void 0 : _d.email) || 'Unknown',
                        requestedAt: log.created_at.toISOString(),
                        reviewedBy: ((_e = log.admin) === null || _e === void 0 ? void 0 : _e.fullName) || ((_f = log.admin) === null || _f === void 0 ? void 0 : _f.email),
                        reviewedAt: (_g = log.updated_at) === null || _g === void 0 ? void 0 : _g.toISOString(),
                        details: log.metadata || {}
                    });
                });
                res.json({
                    success: true,
                    approvals: mappedApprovals
                });
            }
            catch (error) {
                console.error('Error fetching approvals:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch approvals'
                });
            }
        };
        this.approveRequest = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!adminId) {
                    res.status(401).json({
                        success: false,
                        error: 'Admin authentication required'
                    });
                    return;
                }
                const approvalLogRepo = (0, typeorm_1.getRepository)(ApprovalLog_1.ApprovalLog);
                const approval = await approvalLogRepo.findOne({
                    where: { id },
                    relations: ['user']
                });
                if (!approval) {
                    res.status(404).json({
                        success: false,
                        error: 'Approval request not found'
                    });
                    return;
                }
                approval.action = 'approved';
                approval.admin_id = adminId;
                approval.updated_at = new Date();
                await approvalLogRepo.save(approval);
                res.json({
                    success: true,
                    message: 'Request approved successfully'
                });
            }
            catch (error) {
                console.error('Error approving request:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to approve request'
                });
            }
        };
        this.rejectRequest = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const { reason } = req.body;
                const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!adminId) {
                    res.status(401).json({
                        success: false,
                        error: 'Admin authentication required'
                    });
                    return;
                }
                const approvalLogRepo = (0, typeorm_1.getRepository)(ApprovalLog_1.ApprovalLog);
                const approval = await approvalLogRepo.findOne({
                    where: { id },
                    relations: ['user']
                });
                if (!approval) {
                    res.status(404).json({
                        success: false,
                        error: 'Approval request not found'
                    });
                    return;
                }
                approval.action = 'rejected';
                approval.admin_id = adminId;
                approval.notes = reason || approval.notes;
                approval.updated_at = new Date();
                await approvalLogRepo.save(approval);
                res.json({
                    success: true,
                    message: 'Request rejected successfully'
                });
            }
            catch (error) {
                console.error('Error rejecting request:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to reject request'
                });
            }
        };
        // System Status
        this.getSystemStatus = async (req, res) => {
            try {
                const supplierRepo = (0, typeorm_1.getRepository)(Supplier_1.Supplier);
                const partnerRepo = (0, typeorm_1.getRepository)(Partner_1.Partner);
                const productRepo = (0, typeorm_1.getRepository)(Product_1.Product);
                const commissionRepo = (0, typeorm_1.getRepository)(PartnerCommission_1.PartnerCommission);
                const [suppliersCount, partnersCount, productsCount, commissionsCount] = await Promise.all([
                    supplierRepo.count(),
                    partnerRepo.count(),
                    productRepo.count(),
                    commissionRepo.count()
                ]);
                const status = {
                    cpts: {
                        ds_supplier: 'installed',
                        ds_partner: 'installed',
                        ds_product: 'installed',
                        ds_commission_policy: 'installed'
                    },
                    records: {
                        suppliers: suppliersCount,
                        partners: partnersCount,
                        products: productsCount,
                        commissions: commissionsCount
                    },
                    fieldGroups: 4, // Number of CPT field groups
                    systemReady: true
                };
                res.json(status);
            }
            catch (error) {
                console.error('Error fetching system status:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch system status'
                });
            }
        };
        // Initialize System
        this.initializeSystem = async (req, res) => {
            try {
                // System is already initialized with TypeORM entities
                // This endpoint can be used for additional setup if needed
                res.json({
                    success: true,
                    message: 'Dropshipping system is already initialized',
                    data: {
                        entities: ['Supplier', 'Partner', 'PartnerCommission', 'Product'],
                        initialized: true
                    }
                });
            }
            catch (error) {
                console.error('Error initializing system:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to initialize system'
                });
            }
        };
        // Create Sample Data
        this.createSampleData = async (req, res) => {
            try {
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                const supplierRepo = (0, typeorm_1.getRepository)(Supplier_1.Supplier);
                const partnerRepo = (0, typeorm_1.getRepository)(Partner_1.Partner);
                // Create sample suppliers
                const sampleSuppliers = [];
                for (let i = 1; i <= 3; i++) {
                    const user = userRepo.create({
                        email: `supplier${i}@example.com`,
                        password: 'password123',
                        firstName: `Supplier`,
                        lastName: `${i}`,
                        role: User_1.UserRole.SUPPLIER,
                        status: User_1.UserStatus.APPROVED,
                        isActive: true
                    });
                    await userRepo.save(user);
                    const supplier = supplierRepo.create({
                        userId: user.id,
                        status: Supplier_1.SupplierStatus.APPROVED,
                        tier: Supplier_1.SupplierTier.BASIC,
                        companyDescription: `Sample supplier company ${i}`,
                        defaultPartnerCommissionRate: 5 + i,
                        isActive: true
                    });
                    await supplierRepo.save(supplier);
                    sampleSuppliers.push(supplier);
                }
                // Create sample partners
                const samplePartners = [];
                for (let i = 1; i <= 5; i++) {
                    const user = userRepo.create({
                        email: `partner${i}@example.com`,
                        password: 'password123',
                        firstName: `Partner`,
                        lastName: `${i}`,
                        role: User_1.UserRole.PARTNER,
                        status: User_1.UserStatus.APPROVED,
                        isActive: true
                    });
                    await userRepo.save(user);
                    const partner = partnerRepo.create({
                        userId: user.id,
                        sellerId: sampleSuppliers[0].id, // Link to first supplier as seller
                        status: Partner_1.PartnerStatus.ACTIVE,
                        tier: i <= 2 ? Partner_1.PartnerTier.BRONZE : i <= 4 ? Partner_1.PartnerTier.SILVER : Partner_1.PartnerTier.GOLD,
                        referralCode: `REF${i.toString().padStart(3, '0')}`,
                        referralLink: `https://example.com?ref=REF${i.toString().padStart(3, '0')}`,
                        isActive: true
                    });
                    await partnerRepo.save(partner);
                    samplePartners.push(partner);
                }
                res.json({
                    success: true,
                    message: 'Sample data created successfully',
                    suppliers: sampleSuppliers.length,
                    partners: samplePartners.length,
                    products: 0 // Products would be created separately
                });
            }
            catch (error) {
                console.error('Error creating sample data:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create sample data'
                });
            }
        };
    }
}
exports.DropshippingController = DropshippingController;
//# sourceMappingURL=DropshippingController.js.map