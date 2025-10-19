"use strict";
/**
 * CPT-ACF Module Entry Point
 * Exports all public APIs and controllers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_INFO = exports.blockApiRoutes = exports.blockDataService = exports.acfService = exports.cptService = exports.ACFController = exports.CPTController = void 0;
// Controllers
var cpt_controller_1 = require("./controllers/cpt.controller");
Object.defineProperty(exports, "CPTController", { enumerable: true, get: function () { return cpt_controller_1.CPTController; } });
var acf_controller_1 = require("./controllers/acf.controller");
Object.defineProperty(exports, "ACFController", { enumerable: true, get: function () { return acf_controller_1.ACFController; } });
// Services
var cpt_service_1 = require("./services/cpt.service");
Object.defineProperty(exports, "cptService", { enumerable: true, get: function () { return cpt_service_1.cptService; } });
var acf_service_1 = require("./services/acf.service");
Object.defineProperty(exports, "acfService", { enumerable: true, get: function () { return acf_service_1.acfService; } });
var block_data_service_1 = require("./services/block-data.service");
Object.defineProperty(exports, "blockDataService", { enumerable: true, get: function () { return block_data_service_1.blockDataService; } });
// Routes
var block_api_routes_1 = require("./routes/block-api.routes");
Object.defineProperty(exports, "blockApiRoutes", { enumerable: true, get: function () { return __importDefault(block_api_routes_1).default; } });
// Module info
exports.MODULE_INFO = {
    name: 'CPT-ACF Module',
    version: '1.0.0',
    description: 'Custom Post Types and Advanced Custom Fields module with block editor support',
    author: 'O4O Platform Team',
    features: [
        'Custom Post Types management',
        'Advanced Custom Fields management',
        'Block Editor data API',
        'Optimized caching',
        'Clean architecture'
    ]
};
//# sourceMappingURL=index.js.map