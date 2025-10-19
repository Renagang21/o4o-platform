import { Request, Response } from 'express';
export declare class ForumCPTController {
    getSystemStatus: (req: Request, res: Response) => Promise<void>;
    initializeSystem: (req: Request, res: Response) => Promise<void>;
    createSampleData: (req: Request, res: Response) => Promise<void>;
    getStatistics: (req: Request, res: Response) => Promise<void>;
    getCategories: (req: Request, res: Response) => Promise<void>;
    getPosts: (req: Request, res: Response) => Promise<void>;
    getComments: (req: Request, res: Response) => Promise<void>;
    createPost: (req: Request, res: Response) => Promise<void>;
    createComment: (req: Request, res: Response) => Promise<void>;
    getCategory: (req: Request, res: Response) => Promise<void>;
    createCategory: (req: Request, res: Response) => Promise<void>;
    updateCategory: (req: Request, res: Response) => Promise<void>;
    deleteCategory: (req: Request, res: Response) => Promise<void>;
    getPost: (req: Request, res: Response) => Promise<void>;
    updatePost: (req: Request, res: Response) => Promise<void>;
    deletePost: (req: Request, res: Response) => Promise<void>;
    updatePostPin: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=ForumCPTController.d.ts.map