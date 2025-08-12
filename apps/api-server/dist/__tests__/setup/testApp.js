"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
// Create a test app instance
function createTestApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false
    }));
    app.use((0, cors_1.default)());
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
    app.use((0, cookie_parser_1.default)());
    // Mock routes for testing
    app.get('/api/v1/content/posts', (req, res) => {
        res.json({
            status: 'success',
            data: {
                posts: [],
                totalPages: 1,
                currentPage: 1,
                totalItems: 0
            }
        });
    });
    app.post('/api/v1/content/posts', (req, res) => {
        // Check for auth header
        if (!req.headers.authorization) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        // Validate required fields
        if (!req.body.title) {
            return res.status(400).json({ status: 'error', error: 'Title is required' });
        }
        res.status(201).json({
            status: 'success',
            data: {
                post: { id: '1', ...req.body }
            }
        });
    });
    app.get('/api/v1/content/posts/:id', (req, res) => {
        if (req.params.id === 'non-existent') {
            return res.status(404).json({ status: 'error', error: 'Post not found' });
        }
        res.json({
            status: 'success',
            data: {
                post: { id: req.params.id, title: 'Test Post' }
            }
        });
    });
    app.put('/api/v1/content/posts/:id', (req, res) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        res.json({
            status: 'success',
            data: {
                post: { id: req.params.id, ...req.body }
            }
        });
    });
    app.delete('/api/v1/content/posts/:id', (req, res) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        res.json({
            status: 'success',
            message: 'Post deleted'
        });
    });
    app.get('/api/v1/content/categories', (req, res) => {
        res.json({
            status: 'success',
            data: {
                categories: []
            }
        });
    });
    app.get('/api/v1/content/media', (req, res) => {
        res.json({
            status: 'success',
            data: {
                media: []
            }
        });
    });
    app.post('/api/v1/content/media/upload', (req, res) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        res.status(201).json({
            status: 'success',
            data: {
                media: { id: '1', url: '/uploads/test.jpg' }
            }
        });
    });
    app.get('/api/v1/content/authors', (req, res) => {
        res.json({
            status: 'success',
            data: {
                authors: []
            }
        });
    });
    return app;
}
//# sourceMappingURL=testApp.js.map