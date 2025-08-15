import { Request, Response } from 'express';
export declare class ForumController {
    getCategories: (req: Request, res: Response) => Promise<void>;
    getCategoryBySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    createCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getPosts: (req: Request, res: Response) => Promise<void>;
    getPostById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getPostBySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    createPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updatePost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getComments: (req: Request, res: Response) => Promise<void>;
    createComment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getStatistics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    searchPosts: (req: Request, res: Response) => Promise<void>;
    getTrendingPosts: (req: Request, res: Response) => Promise<void>;
    getPopularPosts: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=forumController.d.ts.map