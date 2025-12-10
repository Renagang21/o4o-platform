import { Router, Request, Response } from 'express';
import type { LicenseProfileService } from '../services/LicenseProfileService.js';
import type { RequiredCoursePolicyService } from '../services/RequiredCoursePolicyService.js';
import type { CreditRecordService } from '../services/CreditRecordService.js';
import type { CourseAssignmentService } from '../services/CourseAssignmentService.js';

interface AdminServices {
  licenseProfileService: LicenseProfileService;
  requiredCoursePolicyService: RequiredCoursePolicyService;
  creditRecordService: CreditRecordService;
  courseAssignmentService: CourseAssignmentService;
}

/**
 * YaksaLmsAdminController
 *
 * REST API endpoints for admin overview and statistics.
 * Base path: /lms/yaksa/admin
 */
export function createYaksaLmsAdminRoutes(services: AdminServices): Router {
  const router = Router();
  const {
    licenseProfileService,
    requiredCoursePolicyService,
    creditRecordService,
    courseAssignmentService,
  } = services;

  /**
   * GET /stats
   * Get overall LMS statistics for an organization
   * Query params: organizationId (required)
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.query;

      if (!organizationId || typeof organizationId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'organizationId query parameter is required',
        });
      }

      // Get assignment statistics
      const assignmentStats = await courseAssignmentService.getOrganizationStatistics(
        organizationId
      );

      // Get active policies count
      const activePolicies = await requiredCoursePolicyService.getActivePolicies(
        organizationId
      );

      // Get license profiles
      const profiles = await licenseProfileService.getProfilesByOrganization(
        organizationId
      );

      // Calculate credit statistics
      let totalCreditsEarned = 0;
      let profilesRequiringRenewal = 0;
      for (const profile of profiles) {
        totalCreditsEarned += Number(profile.totalCredits);
        if (profile.isRenewalRequired) {
          profilesRequiringRenewal++;
        }
      }

      return res.json({
        success: true,
        data: {
          organization: {
            id: organizationId,
          },
          assignments: assignmentStats,
          policies: {
            activeCount: activePolicies.length,
          },
          members: {
            totalProfiles: profiles.length,
            profilesRequiringRenewal,
            totalCreditsEarned,
            averageCreditsPerMember:
              profiles.length > 0 ? totalCreditsEarned / profiles.length : 0,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch admin statistics',
      });
    }
  });

  /**
   * GET /license-expiring
   * Get list of members whose license renewal is required
   * Query params: organizationId (optional)
   */
  router.get('/license-expiring', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.query;

      let profiles = await licenseProfileService.getProfilesRequiringRenewal();

      // Filter by organization if provided
      if (organizationId && typeof organizationId === 'string') {
        profiles = profiles.filter(p => p.organizationId === organizationId);
      }

      return res.json({
        success: true,
        data: profiles,
        count: profiles.length,
      });
    } catch (error) {
      console.error('Error fetching expiring licenses:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch expiring licenses',
      });
    }
  });

  /**
   * GET /pending-required-courses
   * Get aggregated view of incomplete required courses
   * Query params: organizationId (required)
   */
  router.get('/pending-required-courses', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.query;

      if (!organizationId || typeof organizationId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'organizationId query parameter is required',
        });
      }

      // Get all required course IDs from active policies
      const requiredCourseIds = await requiredCoursePolicyService.getRequiredCourseIds(
        organizationId
      );

      // Get assignment data for each required course
      const courseStats = await Promise.all(
        requiredCourseIds.map(async courseId => {
          const assignments = await courseAssignmentService.getAssignmentsByCourse(courseId);
          const orgAssignments = assignments.filter(a => a.organizationId === organizationId);

          const completed = orgAssignments.filter(a => a.isCompleted).length;
          const inProgress = orgAssignments.filter(
            a => a.status === 'in_progress'
          ).length;
          const pending = orgAssignments.filter(a => a.status === 'pending').length;
          const overdue = orgAssignments.filter(a => a.isOverdue()).length;

          return {
            courseId,
            totalAssigned: orgAssignments.length,
            completed,
            inProgress,
            pending,
            overdue,
            completionRate:
              orgAssignments.length > 0
                ? (completed / orgAssignments.length) * 100
                : 0,
          };
        })
      );

      // Summary statistics
      const summary = {
        totalRequiredCourses: requiredCourseIds.length,
        totalAssignments: courseStats.reduce((sum, c) => sum + c.totalAssigned, 0),
        totalCompleted: courseStats.reduce((sum, c) => sum + c.completed, 0),
        totalPending: courseStats.reduce((sum, c) => sum + c.pending, 0),
        totalOverdue: courseStats.reduce((sum, c) => sum + c.overdue, 0),
      };

      return res.json({
        success: true,
        data: {
          summary,
          courses: courseStats,
        },
      });
    } catch (error) {
      console.error('Error fetching pending required courses:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pending required courses',
      });
    }
  });

  /**
   * GET /overdue-assignments
   * Get all overdue assignments
   * Query params: organizationId (optional)
   */
  router.get('/overdue-assignments', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.query;

      const overdue = await courseAssignmentService.getOverdueAssignments(
        typeof organizationId === 'string' ? organizationId : undefined
      );

      return res.json({
        success: true,
        data: overdue,
        count: overdue.length,
      });
    } catch (error) {
      console.error('Error fetching overdue assignments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch overdue assignments',
      });
    }
  });

  /**
   * POST /expire-overdue
   * Batch expire all overdue assignments
   */
  router.post('/expire-overdue', async (req: Request, res: Response) => {
    try {
      const expiredCount = await courseAssignmentService.expireOverdueAssignments();

      return res.json({
        success: true,
        message: `${expiredCount} assignments marked as expired`,
        data: {
          expiredCount,
        },
      });
    } catch (error) {
      console.error('Error expiring overdue assignments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to expire overdue assignments',
      });
    }
  });

  /**
   * GET /unverified-credits
   * Get all unverified credit records for review
   */
  router.get('/unverified-credits', async (req: Request, res: Response) => {
    try {
      const unverified = await creditRecordService.getUnverifiedCredits();

      return res.json({
        success: true,
        data: unverified,
        count: unverified.length,
      });
    } catch (error) {
      console.error('Error fetching unverified credits:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch unverified credits',
      });
    }
  });

  /**
   * GET /dashboard
   * Get comprehensive dashboard data
   * Query params: organizationId (required)
   */
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.query;

      if (!organizationId || typeof organizationId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'organizationId query parameter is required',
        });
      }

      // Parallel fetch all dashboard data
      const [
        assignmentStats,
        activePolicies,
        profiles,
        requiredCourseIds,
        overdueAssignments,
        unverifiedCredits,
      ] = await Promise.all([
        courseAssignmentService.getOrganizationStatistics(organizationId),
        requiredCoursePolicyService.getActivePolicies(organizationId),
        licenseProfileService.getProfilesByOrganization(organizationId),
        requiredCoursePolicyService.getRequiredCourseIds(organizationId),
        courseAssignmentService.getOverdueAssignments(organizationId),
        creditRecordService.getUnverifiedCredits(),
      ]);

      // Calculate profile statistics
      let totalCredits = 0;
      let renewalRequired = 0;
      for (const profile of profiles) {
        totalCredits += Number(profile.totalCredits);
        if (profile.isRenewalRequired) renewalRequired++;
      }

      return res.json({
        success: true,
        data: {
          overview: {
            totalMembers: profiles.length,
            membersRequiringRenewal: renewalRequired,
            activePolicies: activePolicies.length,
            requiredCourses: requiredCourseIds.length,
          },
          assignments: {
            ...assignmentStats,
            overdueCount: overdueAssignments.length,
          },
          credits: {
            totalEarned: totalCredits,
            averagePerMember: profiles.length > 0 ? totalCredits / profiles.length : 0,
            pendingVerification: unverifiedCredits.length,
          },
          alerts: {
            overdueAssignments: overdueAssignments.length,
            unverifiedCredits: unverifiedCredits.length,
            renewalRequired,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
      });
    }
  });

  return router;
}
