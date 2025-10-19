import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class TagController {
    private tagService;
    constructor();
    /**
     * Get all tags with optional filtering and pagination
     */
    getTags(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get a single tag by ID
     */
    getTag(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Create a new tag
     */
    createTag(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Update an existing tag
     */
    updateTag(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Delete a tag
     */
    deleteTag(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Merge tags - combines one tag into another
     */
    mergeTags(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get tag statistics
     */
    getTagStats(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get popular tags
     */
    getPopularTags(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=TagController.d.ts.map