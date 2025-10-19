import { Request, Response } from 'express';
import { AuthRequest } from '../../../types/auth';
/**
 * ACF Controller - HTTP layer only, delegates business logic to service
 * Refactored to follow clean architecture pattern
 */
export declare class ACFController {
    /**
     * Get field groups
     */
    static getFieldGroups(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get field group by ID
     */
    static getFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Create field group
     */
    static createFieldGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update field group
     */
    static updateFieldGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete field group
     */
    static deleteFieldGroup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get field values for an entity
     */
    static getFieldValues(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Save field values for an entity
     */
    static saveFieldValues(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Export field groups
     */
    static exportFieldGroups(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Import field groups
     */
    static importFieldGroups(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=acf.controller.d.ts.map