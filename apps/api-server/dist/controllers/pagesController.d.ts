import { Response } from 'express';
import type { AuthRequest } from '../types/auth';
export declare class PagesController {
    private pageRepository;
    private userRepository;
    private customFieldValueRepository;
    getPages(req: AuthRequest, res: Response): Promise<void>;
    getPage(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    createPage(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updatePage(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deletePage(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    clonePage(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    savePageDraft(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    bulkUpdatePages(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    bulkDeletePages(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getPagePreview(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getPageRevisions(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    restorePageRevision(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getPageTree(req: AuthRequest, res: Response): Promise<void>;
    private saveCustomFieldValues;
}
//# sourceMappingURL=pagesController.d.ts.map