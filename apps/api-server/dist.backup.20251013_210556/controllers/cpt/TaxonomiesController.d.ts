import { Request, Response } from 'express';
export declare class TaxonomiesController {
    private taxonomyRepo;
    private termRepo;
    private termRelationshipRepo;
    getAllTaxonomies(req: Request, res: Response): Promise<void>;
    getTaxonomyById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createTaxonomy(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateTaxonomy(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteTaxonomy(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTermsByTaxonomy(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTermById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createTerm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateTerm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteTerm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignTermsToObject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getObjectTerms(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=TaxonomiesController.d.ts.map