import { Request, Response } from 'express';
import { AuthRequest } from '../../../types/auth';
/**
 * CPT Controller - HTTP layer only, delegates business logic to service
 * Refactored to follow clean architecture pattern
 */
export declare class CPTController {
    /**
     * Get all CPTs
     */
    static getAllCPTs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get CPT by slug
     */
    static getCPTBySlug(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Create CPT
     */
    static createCPT(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update CPT
     */
    static updateCPT(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete CPT
     */
    static deleteCPT(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get posts by CPT
     */
    static getPostsByCPT(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get post by ID
     */
    static getPostById(req: Request, res: Response): Promise<void>;
    /**
     * Create post
     */
    static createPost(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update post
     */
    static updatePost(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete post
     */
    static deletePost(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Initialize defaults
     */
    static initializeDefaults(req: Request, res: Response): Promise<void>;
    static getCPT(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCPTPosts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=cpt.controller.d.ts.map