import { Router } from 'express';
import { SignageController } from '../controllers/signageController';
import { authenticate } from '../middleware/auth.middleware';
import { validateSignageContent, validateStore, validatePlaylist } from '../middleware/validation';

const router: Router = Router();
const signageController = new SignageController();

// Apply authentication to all routes
router.use(authenticate);

// Content Management Routes
router.get('/contents', signageController.getContents.bind(signageController));
router.get('/contents/:id', signageController.getContentById.bind(signageController));
router.post('/contents', validateSignageContent, signageController.createContent.bind(signageController));
router.put('/contents/:id', validateSignageContent, signageController.updateContent.bind(signageController));
router.delete('/contents/:id', signageController.deleteContent.bind(signageController));
router.patch('/contents/:id/approval', signageController.approveRejectContent.bind(signageController));

// Store Management Routes
router.get('/stores', signageController.getStores.bind(signageController));
router.post('/stores', validateStore, signageController.createStore.bind(signageController));
router.put('/stores/:id', validateStore, signageController.updateStore.bind(signageController));
router.delete('/stores/:id', signageController.deleteStore.bind(signageController));

// Playlist Management Routes - removed for production
// router.get('/stores/:storeId/playlists', ...); // Removed - methods deleted from controller
// router.post('/stores/:storeId/playlists', ...); // Removed - methods deleted from controller
// router.put('/playlists/:id', ...); // Removed - methods deleted from controller
// router.delete('/playlists/:id', ...); // Removed - methods deleted from controller

// Playlist Items Routes - removed for production
// router.get('/playlists/:playlistId/items', ...); // Removed - methods deleted from controller
// router.post('/playlists/:playlistId/items', ...); // Removed - methods deleted from controller
// router.put('/playlist-items/:itemId', ...); // Removed - methods deleted from controller
// router.delete('/playlist-items/:itemId', ...); // Removed - methods deleted from controller
// router.patch('/playlists/:playlistId/items/reorder', ...); // Removed - methods deleted from controller

// Schedule Management Routes - removed for production
// router.get('/stores/:storeId/schedules', ...); // Removed - methods deleted from controller
// router.post('/stores/:storeId/schedules', ...); // Removed - methods deleted from controller
// router.put('/schedules/:id', ...); // Removed - methods deleted from controller
// router.delete('/schedules/:id', ...); // Removed - methods deleted from controller
// router.get('/stores/:storeId/schedules/active', ...); // Removed - methods deleted from controller

// Template Management Routes - removed for production
// router.get('/templates', ...); // Removed - methods deleted from controller
// router.post('/templates', ...); // Removed - methods deleted from controller
// router.put('/templates/:id', ...); // Removed - methods deleted from controller
// router.delete('/templates/:id', ...); // Removed - methods deleted from controller

// Analytics Routes - removed for production
// router.get('/analytics/content-usage', ...); // Removed - methods deleted from controller
// router.get('/analytics/store-performance', ...); // Removed - methods deleted from controller

// Playback Control Routes - removed for production
// router.get('/stores/:storeId/playback/status', ...); // Removed - methods deleted from controller
// router.post('/stores/:storeId/playback/change', ...); // Removed - methods deleted from controller
// router.post('/stores/:storeId/playback/control', ...); // Removed - methods deleted from controller

export default router;