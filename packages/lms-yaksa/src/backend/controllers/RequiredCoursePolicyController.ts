import { Router, Request, Response } from 'express';
import type { RequiredCoursePolicyService } from '../services/RequiredCoursePolicyService.js';

/**
 * RequiredCoursePolicyController
 *
 * REST API endpoints for managing required course policies.
 * Base path: /lms/yaksa/policies/required-courses
 */
export function createRequiredCoursePolicyRoutes(
  policyService: RequiredCoursePolicyService
): Router {
  const router = Router();

  /**
   * GET /
   * Get all policies for an organization
   * Query params: organizationId (required)
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.query;

      if (!organizationId || typeof organizationId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'organizationId query parameter is required',
        });
      }

      const policies = await policyService.getPoliciesByOrganization(organizationId);

      return res.json({
        success: true,
        data: policies,
      });
    } catch (error) {
      console.error('Error fetching policies:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch policies',
      });
    }
  });

  /**
   * GET /:id
   * Get a specific policy by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await policyService.getPolicy(id);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      return res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      console.error('Error fetching policy:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch policy',
      });
    }
  });

  /**
   * POST /
   * Create a new required course policy
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { organizationId, ...policyData } = req.body;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
      }

      const policy = await policyService.createPolicy(organizationId, policyData);

      return res.status(201).json({
        success: true,
        data: policy,
      });
    } catch (error: any) {
      console.error('Error creating policy:', error);

      if (error.message?.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create policy',
      });
    }
  });

  /**
   * PATCH /:id
   * Update a policy
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const policy = await policyService.updatePolicy(id, data);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      return res.json({
        success: true,
        data: policy,
      });
    } catch (error: any) {
      console.error('Error updating policy:', error);

      if (error.message?.includes('already exists') || error.message?.includes('must be')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update policy',
      });
    }
  });

  /**
   * POST /:id/activate
   * Activate a policy
   */
  router.post('/:id/activate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await policyService.setActive(id, true);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      return res.json({
        success: true,
        data: policy,
        message: 'Policy activated successfully',
      });
    } catch (error) {
      console.error('Error activating policy:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to activate policy',
      });
    }
  });

  /**
   * POST /:id/deactivate
   * Deactivate a policy
   */
  router.post('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await policyService.setActive(id, false);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      return res.json({
        success: true,
        data: policy,
        message: 'Policy deactivated successfully',
      });
    } catch (error) {
      console.error('Error deactivating policy:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to deactivate policy',
      });
    }
  });

  /**
   * POST /:id/courses/:courseId
   * Add a course to the policy's required list
   */
  router.post('/:id/courses/:courseId', async (req: Request, res: Response) => {
    try {
      const { id, courseId } = req.params;
      const policy = await policyService.addRequiredCourse(id, courseId);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      return res.json({
        success: true,
        data: policy,
        message: 'Course added to policy',
      });
    } catch (error) {
      console.error('Error adding course to policy:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add course to policy',
      });
    }
  });

  /**
   * DELETE /:id/courses/:courseId
   * Remove a course from the policy's required list
   */
  router.delete('/:id/courses/:courseId', async (req: Request, res: Response) => {
    try {
      const { id, courseId } = req.params;
      const policy = await policyService.removeRequiredCourse(id, courseId);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      return res.json({
        success: true,
        data: policy,
        message: 'Course removed from policy',
      });
    } catch (error) {
      console.error('Error removing course from policy:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to remove course from policy',
      });
    }
  });

  /**
   * DELETE /:id
   * Delete a policy
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await policyService.deletePolicy(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      return res.json({
        success: true,
        message: 'Policy deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting policy:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete policy',
      });
    }
  });

  return router;
}
