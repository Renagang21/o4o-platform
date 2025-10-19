import { Request, Response } from 'express';
export declare class PostController {
    private postRepository;
    private tagRepository;
    private categoryRepository;
    private userRepository;
    getPosts: (req: Request, res: Response) => Promise<void>;
    getPost: (req: Request, res: Response) => Promise<void>;
    createPost: (req: Request, res: Response) => Promise<void>;
    updatePost: (req: Request, res: Response) => Promise<void>;
    deletePost: (req: Request, res: Response) => Promise<void>;
    restorePost: (req: Request, res: Response) => Promise<void>;
    bulkAction: (req: Request, res: Response) => Promise<void>;
    getRevisions: (req: Request, res: Response) => Promise<void>;
    restoreRevision: (req: Request, res: Response) => Promise<void>;
    autoSave: (req: Request, res: Response) => Promise<void>;
    getPreview: (req: Request, res: Response) => Promise<void>;
    duplicatePost: (req: Request, res: Response) => Promise<void>;
    private formatPostResponse;
    private getOrCreateTags;
}
//# sourceMappingURL=PostController.d.ts.map