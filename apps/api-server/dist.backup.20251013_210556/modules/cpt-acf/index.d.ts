/**
 * CPT-ACF Module Entry Point
 * Exports all public APIs and controllers
 */
export { CPTController } from './controllers/cpt.controller';
export { ACFController } from './controllers/acf.controller';
export { cptService } from './services/cpt.service';
export { acfService } from './services/acf.service';
export { blockDataService } from './services/block-data.service';
export { default as blockApiRoutes } from './routes/block-api.routes';
export declare const MODULE_INFO: {
    name: string;
    version: string;
    description: string;
    author: string;
    features: string[];
};
//# sourceMappingURL=index.d.ts.map