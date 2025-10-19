import { Request, Response } from 'express';
export declare class UserRoleSwitchController {
    private static userRepository;
    private static roleRepository;
    private static activityRepository;
    /**
     * Switch active role for current user
     * PATCH /api/users/me/active-role
     */
    static switchActiveRole(req: Request, res: Response): Promise<void>;
    /**
     * Get current user's roles
     * GET /api/users/me/roles
     */
    static getCurrentUserRoles(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=userRoleSwitch.controller.d.ts.map