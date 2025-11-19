import { Router } from 'express';
import { PartnerLinksController } from '../../controllers/partner/PartnerLinksController.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new PartnerLinksController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/v1/partner/links
 * @desc Fetch partner links with filters, sorting, and pagination
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @query status - Filter by status (active, inactive, all)
 * @query search - Search in name, url, description
 * @query sort_by - Sort field (name, clicks, created_at)
 * @query sort_order - Sort order (asc, desc)
 * @access Private (Partner, Admin)
 */
router.get('/', controller.getLinks.bind(controller));

/**
 * @route GET /api/v1/partner/links/:id
 * @desc Fetch partner link detail by ID
 * @param id - Link ID
 * @access Private (Partner, Admin)
 */
router.get('/:id', controller.getLinkDetail.bind(controller));

/**
 * @route POST /api/v1/partner/links
 * @desc Create new partner link
 * @body name - Link name [required]
 * @body description - Link description
 * @body base_url - Base URL to link to [required]
 * @body utm_source - UTM source parameter
 * @body utm_medium - UTM medium parameter
 * @body utm_campaign - UTM campaign parameter
 * @body status - Link status (active, inactive)
 * @access Private (Partner, Admin)
 */
router.post('/', controller.createLink.bind(controller));

/**
 * @route PATCH /api/v1/partner/links/:id
 * @desc Update partner link
 * @param id - Link ID
 * @body name - Link name
 * @body description - Link description
 * @body base_url - Base URL
 * @body utm_source - UTM source
 * @body utm_medium - UTM medium
 * @body utm_campaign - UTM campaign
 * @body status - Link status
 * @access Private (Partner, Admin)
 */
router.patch('/:id', controller.updateLink.bind(controller));

/**
 * @route DELETE /api/v1/partner/links/:id
 * @desc Delete partner link
 * @param id - Link ID
 * @access Private (Partner, Admin)
 */
router.delete('/:id', controller.deleteLink.bind(controller));

export default router;
