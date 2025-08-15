import { Request, Response } from 'express';
export declare class CPTController {
    static getAllCPTs(req: Request, res: Response): Promise<void>;
    static getCPTBySlug(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createCPT(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateCPT(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteCPT(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPostsByCPT(req: Request, res: Response): Promise<void>;
    static createPost(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static validateFieldGroups;
    private static validatePostFields;
    static getPostById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updatePost(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deletePost(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPublicPosts(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=cptController.d.ts.map