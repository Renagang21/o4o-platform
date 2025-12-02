import { Router, Request, Response } from 'express';
import { SignageController } from '../controllers/SignageController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAnyRole, requireAdmin } from '../middleware/permission.middleware.js';

const router: Router = Router();
const signageController = new SignageController();

/**
 * Digital Signage Routes
 * Manages devices, slides, playlists, and schedules for digital signage system
 */

// Public route - get current playlist for device (for player)
router.get('/now', signageController.getCurrentPlaylist);

// Protected routes - require authentication
router.use(authenticate);

// Device routes
router.get('/devices', signageController.getDevices);
router.post('/devices', requireAnyRole(['admin', 'editor']), signageController.createDevice);
router.get('/devices/:id', signageController.getDevice);
router.put('/devices/:id', requireAnyRole(['admin', 'editor']), signageController.updateDevice);
router.delete('/devices/:id', requireAdmin, signageController.deleteDevice);

// Slide routes
router.get('/slides', signageController.getSlides);
router.post('/slides', requireAnyRole(['admin', 'editor']), signageController.createSlide);
router.get('/slides/:id', signageController.getSlide);
router.put('/slides/:id', requireAnyRole(['admin', 'editor']), signageController.updateSlide);
router.delete('/slides/:id', requireAdmin, signageController.deleteSlide);

// Playlist routes
router.get('/playlists', signageController.getPlaylists);
router.post('/playlists', requireAnyRole(['admin', 'editor']), signageController.createPlaylist);
router.get('/playlists/:id', signageController.getPlaylist);
router.put('/playlists/:id', requireAnyRole(['admin', 'editor']), signageController.updatePlaylist);
router.delete('/playlists/:id', requireAdmin, signageController.deletePlaylist);

// Schedule routes
router.get('/schedules', signageController.getSchedules);
router.post('/schedules', requireAnyRole(['admin', 'editor']), signageController.createSchedule);
router.put('/schedules/:id', requireAnyRole(['admin', 'editor']), signageController.updateSchedule);
router.delete('/schedules/:id', requireAdmin, signageController.deleteSchedule);

// Stats route
router.get('/stats', signageController.getStats);

export default router;
