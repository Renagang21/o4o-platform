"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropshippingCPTController = void 0;
const connection_1 = require("../../database/connection");
const CustomPost_1 = require("../../entities/CustomPost");
const CustomPostType_1 = require("../../entities/CustomPostType");
const CustomField_1 = require("../../entities/CustomField");
class DropshippingCPTController {
    // Get all products with ACF fields
    async getProducts(req, res) {
        try {
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            // Get all products - support both 'product' and 'ds_product' types
            const products = await connection_1.AppDataSource.query(`SELECT * FROM custom_posts
         WHERE cpt_slug IN ('product', 'ds_product')
         AND (status = 'publish' OR status = 'published')
         ORDER BY created_at DESC`);
            // Format products with metadata
            const productsWithFields = products.map(product => {
                // Extract ACF fields from meta_data if available
                const metaData = product.meta_data || {};
                // Calculate margin if prices exist
                if (metaData.price && metaData.sale_price) {
                    const price = Number(metaData.price);
                    const salePrice = Number(metaData.sale_price);
                    metaData.margin_rate = price > 0
                        ? ((price - salePrice) / price * 100).toFixed(2)
                        : '0';
                }
                return {
                    id: product.id,
                    title: product.title,
                    content: product.content,
                    excerpt: product.excerpt,
                    status: product.status,
                    createdAt: product.created_at,
                    updatedAt: product.updated_at,
                    acf: {
                        cost_price: metaData.price,
                        selling_price: metaData.sale_price,
                        margin_rate: metaData.margin_rate,
                        supplier: metaData.dropshipping_supplier,
                        supplier_sku: metaData.sku,
                        shipping_days_min: 3,
                        shipping_days_max: 7,
                        shipping_fee: metaData.shipping_fee || 3000,
                        stock_quantity: metaData.stock_quantity,
                        ...metaData
                    }
                };
            });
            res.json({
                success: true,
                data: productsWithFields
            });
        }
        catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }
    }
    // Create a new product
    async createProduct(req, res) {
        var _a;
        try {
            const { title, content, excerpt, acf } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const postTypeRepo = connection_1.AppDataSource.getRepository(CustomPostType_1.CustomPostType);
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            const fieldRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomField);
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            // Get ds_product post type
            const productType = await postTypeRepo.findOne({
                where: { slug: 'ds_product' }
            });
            if (!productType) {
                return res.status(404).json({
                    success: false,
                    message: 'Product post type not found'
                });
            }
            // Create the product post
            const product = customPostRepo.create({
                postTypeSlug: 'ds_product',
                title: title || 'Untitled Product',
                content: content || '',
                status: CustomPost_1.PostStatus.PUBLISHED,
                authorId: userId,
                slug: title ? title.toLowerCase().replace(/\s+/g, '-') : 'product-' + Date.now(),
                meta: {
                    seoDescription: excerpt || ''
                }
            });
            const savedProduct = await customPostRepo.save(product);
            const productId = Array.isArray(savedProduct) ? savedProduct[0].id : savedProduct.id;
            // Save ACF fields if provided
            if (acf) {
                // Get pricing field group
                const pricingGroup = await fieldGroupRepo.findOne({
                    where: { title: '가격 정보' },
                    relations: ['fields']
                });
                if (pricingGroup) {
                    for (const fieldName of Object.keys(acf)) {
                        const field = pricingGroup.fields.find(f => f.name === fieldName);
                        if (field) {
                            const fieldValue = fieldValueRepo.create({
                                fieldId: field.id,
                                entityId: productId,
                                entityType: 'ds_product',
                                value: acf[fieldName]
                            });
                            await fieldValueRepo.save(fieldValue);
                        }
                    }
                }
            }
            res.status(201).json({
                success: true,
                data: savedProduct,
                message: 'Product created successfully'
            });
        }
        catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create product'
            });
        }
    }
    // Update a product
    async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const { title, content, excerpt, acf } = req.body;
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            // Find the product
            const product = await customPostRepo.findOne({ where: { id } });
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            // Update product fields
            if (title)
                product.title = title;
            if (content)
                product.content = content;
            if (excerpt) {
                product.meta = {
                    ...product.meta,
                    seoDescription: excerpt
                };
            }
            await customPostRepo.save(product);
            // Update ACF fields if provided
            if (acf) {
                const pricingGroup = await fieldGroupRepo.findOne({
                    where: { title: '가격 정보' },
                    relations: ['fields']
                });
                if (pricingGroup) {
                    for (const fieldName of Object.keys(acf)) {
                        const field = pricingGroup.fields.find(f => f.name === fieldName);
                        if (field) {
                            // Check if field value exists
                            let fieldValue = await fieldValueRepo.findOne({
                                where: {
                                    fieldId: field.id,
                                    entityId: product.id,
                                    entityType: 'ds_product'
                                }
                            });
                            if (fieldValue) {
                                fieldValue.value = acf[fieldName];
                            }
                            else {
                                fieldValue = fieldValueRepo.create({
                                    fieldId: field.id,
                                    entityId: product.id,
                                    entityType: 'ds_product',
                                    value: acf[fieldName]
                                });
                            }
                            await fieldValueRepo.save(fieldValue);
                        }
                    }
                }
            }
            res.json({
                success: true,
                data: product,
                message: 'Product updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update product'
            });
        }
    }
    // Delete a product
    async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            // Find the product
            const product = await customPostRepo.findOne({ where: { id } });
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            // Delete ACF field values
            await fieldValueRepo.delete({
                entityId: product.id,
                entityType: 'ds_product'
            });
            // Delete the product
            await customPostRepo.remove(product);
            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete product'
            });
        }
    }
    // Calculate margin for given prices
    async calculateMargin(req, res) {
        try {
            const { cost_price, selling_price } = req.body;
            const costPrice = Number(cost_price) || 0;
            const sellingPrice = Number(selling_price) || 0;
            const marginRate = sellingPrice > 0
                ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2)
                : '0';
            const profit = sellingPrice - costPrice;
            res.json({
                success: true,
                data: {
                    cost_price: costPrice,
                    selling_price: sellingPrice,
                    margin_rate: marginRate,
                    profit: profit
                }
            });
        }
        catch (error) {
            console.error('Error calculating margin:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to calculate margin'
            });
        }
    }
    // Get all partners
    async getPartners(req, res) {
        try {
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const partners = await customPostRepo.find({
                where: {
                    postTypeSlug: 'ds_partner',
                    status: CustomPost_1.PostStatus.PUBLISHED
                },
                order: { createdAt: 'DESC' }
            });
            res.json({
                success: true,
                data: partners
            });
        }
        catch (error) {
            console.error('Error fetching partners:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch partners'
            });
        }
    }
    // Create a new partner
    async createPartner(req, res) {
        var _a;
        try {
            const { title, content, acf } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const postTypeRepo = connection_1.AppDataSource.getRepository(CustomPostType_1.CustomPostType);
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            // Get ds_partner post type
            const partnerType = await postTypeRepo.findOne({
                where: { slug: 'ds_partner' }
            });
            if (!partnerType) {
                return res.status(404).json({
                    success: false,
                    message: 'Partner post type not found'
                });
            }
            // Generate referral code
            const referralCode = 'PTR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            // Create the partner post
            const partner = customPostRepo.create({
                postTypeSlug: 'ds_partner',
                title: title || 'Untitled Partner',
                content: content || '',
                status: CustomPost_1.PostStatus.PUBLISHED,
                authorId: userId,
                slug: title ? title.toLowerCase().replace(/\s+/g, '-') : 'partner-' + Date.now()
            });
            const savedPartner = await customPostRepo.save(partner);
            const partnerId = Array.isArray(savedPartner) ? savedPartner[0].id : savedPartner.id;
            // Save ACF fields if provided
            if (acf) {
                // Get partner info field group
                const partnerGroup = await fieldGroupRepo.findOne({
                    where: { title: '파트너 정보' },
                    relations: ['fields']
                });
                if (partnerGroup) {
                    // Add referral code to ACF data
                    const fieldsToSave = { ...acf, partner_referral_code: referralCode };
                    for (const fieldName of Object.keys(fieldsToSave)) {
                        const field = partnerGroup.fields.find(f => f.name === fieldName);
                        if (field) {
                            const fieldValue = fieldValueRepo.create({
                                fieldId: field.id,
                                entityId: partnerId,
                                entityType: 'ds_partner',
                                value: fieldsToSave[fieldName]
                            });
                            await fieldValueRepo.save(fieldValue);
                        }
                    }
                }
            }
            res.status(201).json({
                success: true,
                data: savedPartner,
                message: 'Partner created successfully'
            });
        }
        catch (error) {
            console.error('Error creating partner:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create partner'
            });
        }
    }
    // Update a partner
    async updatePartner(req, res) {
        try {
            const { id } = req.params;
            const { title, content, acf } = req.body;
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            // Find the partner
            const partner = await customPostRepo.findOne({ where: { id } });
            if (!partner) {
                return res.status(404).json({
                    success: false,
                    message: 'Partner not found'
                });
            }
            // Update partner fields
            if (title)
                partner.title = title;
            if (content)
                partner.content = content;
            await customPostRepo.save(partner);
            // Update ACF fields if provided
            if (acf) {
                const partnerGroup = await fieldGroupRepo.findOne({
                    where: { title: '파트너 정보' },
                    relations: ['fields']
                });
                if (partnerGroup) {
                    for (const fieldName of Object.keys(acf)) {
                        const field = partnerGroup.fields.find(f => f.name === fieldName);
                        if (field) {
                            // Check if field value exists
                            let fieldValue = await fieldValueRepo.findOne({
                                where: {
                                    fieldId: field.id,
                                    entityId: partner.id,
                                    entityType: 'ds_partner'
                                }
                            });
                            if (fieldValue) {
                                fieldValue.value = acf[fieldName];
                            }
                            else {
                                fieldValue = fieldValueRepo.create({
                                    fieldId: field.id,
                                    entityId: partner.id,
                                    entityType: 'ds_partner',
                                    value: acf[fieldName]
                                });
                            }
                            await fieldValueRepo.save(fieldValue);
                        }
                    }
                }
            }
            res.json({
                success: true,
                data: partner,
                message: 'Partner updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating partner:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update partner'
            });
        }
    }
    // Get all suppliers
    async getSuppliers(req, res) {
        try {
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const suppliers = await customPostRepo.find({
                where: {
                    postTypeSlug: 'ds_supplier',
                    status: CustomPost_1.PostStatus.PUBLISHED
                },
                order: { createdAt: 'DESC' }
            });
            res.json({
                success: true,
                data: suppliers
            });
        }
        catch (error) {
            console.error('Error fetching suppliers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch suppliers'
            });
        }
    }
    // Create a new supplier
    async createSupplier(req, res) {
        var _a;
        try {
            const { title, content, acf } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const postTypeRepo = connection_1.AppDataSource.getRepository(CustomPostType_1.CustomPostType);
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            // Get ds_supplier post type
            const supplierType = await postTypeRepo.findOne({
                where: { slug: 'ds_supplier' }
            });
            if (!supplierType) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier post type not found'
                });
            }
            // Create the supplier post
            const supplier = customPostRepo.create({
                postTypeSlug: 'ds_supplier',
                title: title || 'Untitled Supplier',
                content: content || '',
                status: CustomPost_1.PostStatus.PUBLISHED,
                authorId: userId,
                slug: title ? title.toLowerCase().replace(/\s+/g, '-') : 'supplier-' + Date.now()
            });
            const savedSupplier = await customPostRepo.save(supplier);
            const supplierId = Array.isArray(savedSupplier) ? savedSupplier[0].id : savedSupplier.id;
            // Save ACF fields if provided
            if (acf) {
                // Get supplier info field group
                const supplierGroup = await fieldGroupRepo.findOne({
                    where: { title: '공급자 정보' },
                    relations: ['fields']
                });
                if (supplierGroup) {
                    for (const fieldName of Object.keys(acf)) {
                        const field = supplierGroup.fields.find(f => f.name === fieldName);
                        if (field) {
                            const fieldValue = fieldValueRepo.create({
                                fieldId: field.id,
                                entityId: supplierId,
                                entityType: 'ds_supplier',
                                value: acf[fieldName]
                            });
                            await fieldValueRepo.save(fieldValue);
                        }
                    }
                }
            }
            res.status(201).json({
                success: true,
                data: savedSupplier,
                message: 'Supplier created successfully'
            });
        }
        catch (error) {
            console.error('Error creating supplier:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create supplier'
            });
        }
    }
    // Update a supplier
    async updateSupplier(req, res) {
        try {
            const { id } = req.params;
            const { title, content, acf } = req.body;
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            // Find the supplier
            const supplier = await customPostRepo.findOne({ where: { id } });
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }
            // Update supplier fields
            if (title)
                supplier.title = title;
            if (content)
                supplier.content = content;
            await customPostRepo.save(supplier);
            // Update ACF fields if provided
            if (acf) {
                const supplierGroup = await fieldGroupRepo.findOne({
                    where: { title: '공급자 정보' },
                    relations: ['fields']
                });
                if (supplierGroup) {
                    for (const fieldName of Object.keys(acf)) {
                        const field = supplierGroup.fields.find(f => f.name === fieldName);
                        if (field) {
                            // Check if field value exists
                            let fieldValue = await fieldValueRepo.findOne({
                                where: {
                                    fieldId: field.id,
                                    entityId: supplier.id,
                                    entityType: 'ds_supplier'
                                }
                            });
                            if (fieldValue) {
                                fieldValue.value = acf[fieldName];
                            }
                            else {
                                fieldValue = fieldValueRepo.create({
                                    fieldId: field.id,
                                    entityId: supplier.id,
                                    entityType: 'ds_supplier',
                                    value: acf[fieldName]
                                });
                            }
                            await fieldValueRepo.save(fieldValue);
                        }
                    }
                }
            }
            res.json({
                success: true,
                data: supplier,
                message: 'Supplier updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating supplier:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update supplier'
            });
        }
    }
    // Delete a supplier
    async deleteSupplier(req, res) {
        try {
            const { id } = req.params;
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            // Find the supplier
            const supplier = await customPostRepo.findOne({ where: { id } });
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }
            // Delete ACF field values
            await fieldValueRepo.delete({
                entityId: supplier.id,
                entityType: 'ds_supplier'
            });
            // Delete the supplier
            await customPostRepo.remove(supplier);
            res.json({
                success: true,
                message: 'Supplier deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting supplier:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete supplier'
            });
        }
    }
    // Delete a partner
    async deletePartner(req, res) {
        try {
            const { id } = req.params;
            const customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
            const fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
            // Find the partner
            const partner = await customPostRepo.findOne({ where: { id } });
            if (!partner) {
                return res.status(404).json({
                    success: false,
                    message: 'Partner not found'
                });
            }
            // Delete ACF field values
            await fieldValueRepo.delete({
                entityId: partner.id,
                entityType: 'ds_partner'
            });
            // Delete the partner
            await customPostRepo.remove(partner);
            res.json({
                success: true,
                message: 'Partner deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting partner:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete partner'
            });
        }
    }
    // Initialize CPTs and ACF fields
    async initializeCPTs(req, res) {
        try {
            const { registerDropshippingCPTs } = await Promise.resolve().then(() => __importStar(require('../../services/cpt/dropshipping-cpts')));
            const { registerDropshippingACFFields } = await Promise.resolve().then(() => __importStar(require('../../services/acf/dropshipping-fields')));
            await registerDropshippingCPTs();
            await registerDropshippingACFFields();
            res.json({
                success: true,
                message: 'CPTs and ACF fields initialized successfully'
            });
        }
        catch (error) {
            console.error('Error initializing CPTs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to initialize CPTs'
            });
        }
    }
}
exports.DropshippingCPTController = DropshippingCPTController;
//# sourceMappingURL=DropshippingCPTController.js.map