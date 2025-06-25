import { Router } from 'express';
import { SignageController } from '../controllers/signageController';
import { authenticateToken } from '../middleware/auth';
import { validateSignageContent, validateStore, validatePlaylist } from '../middleware/validation';

const router = Router();
const signageController = new SignageController();

// Apply authentication to all routes
router.use(authenticateToken);

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

// Playlist Management Routes
router.get('/stores/:storeId/playlists', signageController.getStorePlaylists.bind(signageController));
router.post('/stores/:storeId/playlists', validatePlaylist, signageController.createPlaylist.bind(signageController));
router.put('/playlists/:id', validatePlaylist, signageController.updatePlaylist.bind(signageController));
router.delete('/playlists/:id', signageController.deletePlaylist.bind(signageController));

// Playlist Items Routes
router.get('/playlists/:playlistId/items', signageController.getPlaylistItems.bind(signageController));
router.post('/playlists/:playlistId/items', signageController.addPlaylistItem.bind(signageController));
router.put('/playlist-items/:itemId', signageController.updatePlaylistItem.bind(signageController));
router.delete('/playlist-items/:itemId', signageController.deletePlaylistItem.bind(signageController));
router.patch('/playlists/:playlistId/items/reorder', signageController.reorderPlaylistItems.bind(signageController));

// Schedule Management Routes
router.get('/stores/:storeId/schedules', signageController.getStoreSchedules.bind(signageController));
router.post('/stores/:storeId/schedules', signageController.createSchedule.bind(signageController));
router.put('/schedules/:id', signageController.updateSchedule.bind(signageController));
router.delete('/schedules/:id', signageController.deleteSchedule.bind(signageController));
router.get('/stores/:storeId/schedules/active', signageController.getActiveSchedule.bind(signageController));

// Template Management Routes
router.get('/templates', signageController.getTemplates.bind(signageController));
router.post('/templates', signageController.createTemplate.bind(signageController));
router.put('/templates/:id', signageController.updateTemplate.bind(signageController));
router.delete('/templates/:id', signageController.deleteTemplate.bind(signageController));

// Analytics Routes
router.get('/analytics/content-usage', signageController.getContentUsageAnalytics.bind(signageController));
router.get('/analytics/store-performance', signageController.getStorePerformanceAnalytics.bind(signageController));

// Playback Control Routes
router.get('/stores/:storeId/playback/status', signageController.getPlaybackStatus.bind(signageController));
router.post('/stores/:storeId/playback/change', signageController.changePlaybackContent.bind(signageController));
router.post('/stores/:storeId/playback/control', signageController.controlPlayback.bind(signageController));

export default router;