/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors with filtering and pagination
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, suspended, rejected]
 *         description: Filter by vendor status
 *       - in: query
 *         name: vendorType
 *         schema:
 *           type: string
 *           enum: [individual, company]
 *         description: Filter by vendor type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in vendor name and contact email
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vendor'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new vendor
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorName, vendorType, contactName, contactPhone, contactEmail]
 *             properties:
 *               vendorName:
 *                 type: string
 *                 example: "Tech Vendor Inc."
 *               vendorType:
 *                 type: string
 *                 enum: [individual, company]
 *                 example: "company"
 *               contactName:
 *                 type: string
 *                 example: "John Doe"
 *               contactPhone:
 *                 type: string
 *                 example: "+1-555-123-4567"
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: "john@techvendor.com"
 *               mainCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Electronics", "Software"]
 *               monthlyTarget:
 *                 type: number
 *                 example: 50000
 *               affiliateRate:
 *                 type: number
 *                 example: 12.5
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *                 message:
 *                   type: string
 *                   example: "Vendor created successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /vendors/{id}/commission:
 *   get:
 *     summary: Get vendor commission history
 *     tags: [Vendors, Commissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vendor ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Commission history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VendorCommission'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /vendors/{id}/approve:
 *   post:
 *     summary: Approve vendor application
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vendor ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               affiliateCode:
 *                 type: string
 *                 example: "TECH001"
 *               affiliateRate:
 *                 type: number
 *                 example: 12.5
 *               notes:
 *                 type: string
 *                 example: "Approved after document verification"
 *     responses:
 *       200:
 *         description: Vendor approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *                 message:
 *                   type: string
 *                   example: "Vendor approved successfully"
 *       400:
 *         description: Invalid vendor status for approval
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /vendors/{id}/reject:
 *   post:
 *     summary: Reject vendor application
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Incomplete documentation"
 *               notes:
 *                 type: string
 *                 example: "Missing business registration documents"
 *     responses:
 *       200:
 *         description: Vendor rejected successfully
 *       400:
 *         description: Validation error or invalid status
 *
 * /vendors/pending:
 *   get:
 *     summary: Get pending vendor applications
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Pending vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vendor'
 *
 * /vendors/statistics:
 *   get:
 *     summary: Get vendor statistics and analytics
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalVendors:
 *                           type: integer
 *                         activeVendors:
 *                           type: integer
 *                         pendingVendors:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                           format: decimal
 *                     topVendors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           vendorName:
 *                             type: string
 *                           totalRevenue:
 *                             type: number
 *                           totalSales:
 *                             type: number
 */