import { Router, Request, Response } from 'express';
import type { CourseAssignmentService } from '../services/CourseAssignmentService.js';

/**
 * CourseAssignmentController
 *
 * REST API endpoints for managing course assignments.
 * Base path: /lms/yaksa/course-assignments
 */
export function createCourseAssignmentRoutes(
  assignmentService: CourseAssignmentService
): Router {
  const router = Router();

  /**
   * GET /:userId
   * Get all course assignments for a user
   */
  router.get('/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { activeOnly } = req.query;

      let assignments;
      if (activeOnly === 'true') {
        assignments = await assignmentService.getActiveAssignments(userId);
      } else {
        assignments = await assignmentService.getAssignmentsByUser(userId);
      }

      return res.json({
        success: true,
        data: assignments,
      });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch assignments',
      });
    }
  });

  /**
   * GET /:userId/statistics
   * Get assignment statistics for a user
   */
  router.get('/:userId/statistics', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const stats = await assignmentService.getUserStatistics(userId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics',
      });
    }
  });

  /**
   * POST /
   * Assign a course to a user
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        organizationId,
        courseId,
        policyId,
        dueDate,
        assignedBy,
        isMandatory,
        priority,
        note,
        metadata,
      } = req.body;

      if (!userId || !organizationId || !courseId) {
        return res.status(400).json({
          success: false,
          error: 'userId, organizationId, and courseId are required',
        });
      }

      const assignment = await assignmentService.assignCourse(
        userId,
        organizationId,
        courseId,
        {
          policyId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          assignedBy,
          isMandatory,
          priority,
          note,
          metadata,
        }
      );

      return res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create assignment',
      });
    }
  });

  /**
   * POST /bulk
   * Bulk assign a course to multiple users
   */
  router.post('/bulk', async (req: Request, res: Response) => {
    try {
      const {
        userIds,
        organizationId,
        courseId,
        policyId,
        dueDate,
        assignedBy,
        isMandatory,
      } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'userIds array is required and must not be empty',
        });
      }

      if (!organizationId || !courseId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId and courseId are required',
        });
      }

      const assignments = await assignmentService.bulkAssignCourse(
        userIds,
        organizationId,
        courseId,
        {
          policyId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          assignedBy,
          isMandatory,
        }
      );

      return res.status(201).json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error) {
      console.error('Error bulk assigning course:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to bulk assign course',
      });
    }
  });

  /**
   * POST /by-policy
   * Assign courses based on a policy
   */
  router.post('/by-policy', async (req: Request, res: Response) => {
    try {
      const { policyId, userIds, assignedBy } = req.body;

      if (!policyId || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          error: 'policyId and userIds array are required',
        });
      }

      const assignments = await assignmentService.assignByPolicy(
        policyId,
        userIds,
        assignedBy
      );

      return res.status(201).json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error: any) {
      console.error('Error assigning by policy:', error);

      if (error.message?.includes('not found') || error.message?.includes('inactive')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to assign by policy',
      });
    }
  });

  /**
   * POST /:id/complete
   * Mark an assignment as completed
   */
  router.post('/:id/complete', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { enrollmentId } = req.body;

      const assignment = await assignmentService.markCompleted(id, enrollmentId);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
        });
      }

      return res.json({
        success: true,
        data: assignment,
        message: 'Assignment marked as completed',
      });
    } catch (error) {
      console.error('Error completing assignment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to complete assignment',
      });
    }
  });

  /**
   * POST /:id/progress
   * Update assignment progress
   */
  router.post('/:id/progress', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { progressPercent } = req.body;

      if (progressPercent === undefined) {
        return res.status(400).json({
          success: false,
          error: 'progressPercent is required',
        });
      }

      const assignment = await assignmentService.updateProgress(id, progressPercent);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
        });
      }

      return res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update progress',
      });
    }
  });

  /**
   * POST /:id/link-enrollment
   * Link assignment to an enrollment
   */
  router.post('/:id/link-enrollment', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { enrollmentId } = req.body;

      if (!enrollmentId) {
        return res.status(400).json({
          success: false,
          error: 'enrollmentId is required',
        });
      }

      const assignment = await assignmentService.linkEnrollment(id, enrollmentId);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
        });
      }

      return res.json({
        success: true,
        data: assignment,
        message: 'Enrollment linked successfully',
      });
    } catch (error) {
      console.error('Error linking enrollment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to link enrollment',
      });
    }
  });

  /**
   * POST /:id/cancel
   * Cancel an assignment
   */
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const assignment = await assignmentService.cancelAssignment(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
        });
      }

      return res.json({
        success: true,
        data: assignment,
        message: 'Assignment cancelled',
      });
    } catch (error) {
      console.error('Error cancelling assignment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel assignment',
      });
    }
  });

  /**
   * PATCH /:id
   * Update an assignment
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const assignment = await assignmentService.updateAssignment(id, data);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
        });
      }

      return res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update assignment',
      });
    }
  });

  /**
   * DELETE /:id
   * Delete an assignment
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await assignmentService.deleteAssignment(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
        });
      }

      return res.json({
        success: true,
        message: 'Assignment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete assignment',
      });
    }
  });

  return router;
}
