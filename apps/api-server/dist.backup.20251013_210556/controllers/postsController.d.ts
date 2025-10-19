import { Request, Response } from 'express';
export declare const getAllPosts: (req: Request, res: Response) => Promise<void>;
export declare const getPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deletePost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const autoSavePost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPostRevisions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const previewPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const bulkOperatePosts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPostCounts: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=postsController.d.ts.map