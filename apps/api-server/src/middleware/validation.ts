import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Helper function to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }
  next();
};

// Signage Content Validation
export const validateSignageContent = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  
  body('type')
    .isIn(['youtube', 'vimeo'])
    .withMessage('Type must be either "youtube" or "vimeo"'),
  
  body('url')
    .notEmpty()
    .withMessage('URL is required')
    .isURL()
    .withMessage('Must be a valid URL')
    .custom((value, { req }) => {
      const { type } = req.body;
      if (type === 'youtube') {
        const youtubeRegex = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        if (!youtubeRegex.test(value)) {
          throw new Error('Invalid YouTube URL format');
        }
      } else if (type === 'vimeo') {
        const vimeoRegex = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/;
        if (!vimeoRegex.test(value)) {
          throw new Error('Invalid Vimeo URL format');
        }
      }
      return true;
    }),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string')
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  
  handleValidationErrors
];

// Store Validation
export const validateStore = [
  body('name')
    .notEmpty()
    .withMessage('Store name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Store name must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  
  body('address.street')
    .optional()
    .isString()
    .withMessage('Street must be a string'),
  
  body('address.city')
    .optional()
    .isString()
    .withMessage('City must be a string'),
  
  body('address.state')
    .optional()
    .isString()
    .withMessage('State must be a string'),
  
  body('address.zipcode')
    .optional()
    .isString()
    .withMessage('Zipcode must be a string'),
  
  body('address.country')
    .optional()
    .isString()
    .withMessage('Country must be a string'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Phone must be a valid phone number'),
  
  body('managerId')
    .notEmpty()
    .withMessage('Manager ID is required')
    .isUUID()
    .withMessage('Manager ID must be a valid UUID'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended'),
  
  body('displaySettings')
    .optional()
    .isObject()
    .withMessage('Display settings must be an object'),
  
  body('displaySettings.resolution')
    .optional()
    .matches(/^\d+x\d+$/)
    .withMessage('Resolution must be in format "1920x1080"'),
  
  body('displaySettings.orientation')
    .optional()
    .isIn(['landscape', 'portrait'])
    .withMessage('Orientation must be either "landscape" or "portrait"'),
  
  handleValidationErrors
];

// Playlist Validation
export const validatePlaylist = [
  body('name')
    .notEmpty()
    .withMessage('Playlist name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Playlist name must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'scheduled'])
    .withMessage('Status must be one of: active, inactive, scheduled'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean'),
  
  body('loop')
    .optional()
    .isBoolean()
    .withMessage('loop must be a boolean'),
  
  handleValidationErrors
];

// Playlist Item Validation
export const validatePlaylistItem = [
  body('type')
    .isIn(['video', 'image'])
    .withMessage('Type must be either "video" or "image"'),
  
  body('order')
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  
  body('contentId')
    .if(body('type').equals('video'))
    .notEmpty()
    .withMessage('Content ID is required for video items')
    .isUUID()
    .withMessage('Content ID must be a valid UUID'),
  
  body('imageUrl')
    .if(body('type').equals('image'))
    .notEmpty()
    .withMessage('Image URL is required for image items')
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  
  body('customSettings')
    .optional()
    .isObject()
    .withMessage('Custom settings must be an object'),
  
  body('customSettings.volume')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Volume must be between 0 and 100'),
  
  body('customSettings.startTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Start time must be a non-negative integer'),
  
  body('customSettings.endTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('End time must be a non-negative integer'),
  
  handleValidationErrors
];

// Schedule Validation
export const validateSchedule = [
  body('name')
    .notEmpty()
    .withMessage('Schedule name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Schedule name must be between 1 and 200 characters'),
  
  body('type')
    .isIn(['daily', 'weekly', 'one_time'])
    .withMessage('Type must be one of: daily, weekly, one_time'),
  
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && value <= startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('daysOfWeek')
    .if(body('type').equals('weekly'))
    .isArray({ min: 1, max: 7 })
    .withMessage('Days of week must be an array with 1-7 elements'),
  
  body('daysOfWeek.*')
    .if(body('type').equals('weekly'))
    .isInt({ min: 0, max: 6 })
    .withMessage('Each day must be an integer between 0 (Sunday) and 6 (Saturday)'),
  
  body('specificDate')
    .if(body('type').equals('one_time'))
    .notEmpty()
    .withMessage('Specific date is required for one-time schedules')
    .isISO8601()
    .withMessage('Specific date must be in ISO 8601 format'),
  
  body('validFrom')
    .optional()
    .isISO8601()
    .withMessage('Valid from date must be in ISO 8601 format'),
  
  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until date must be in ISO 8601 format'),
  
  body('priority')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Priority must be a non-negative integer'),
  
  body('playlistId')
    .notEmpty()
    .withMessage('Playlist ID is required')
    .isUUID()
    .withMessage('Playlist ID must be a valid UUID'),
  
  handleValidationErrors
];

// Template Validation
export const validateTemplate = [
  body('name')
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Template name must be between 1 and 200 characters'),
  
  body('layout')
    .isObject()
    .withMessage('Layout must be an object'),
  
  body('layout.zones')
    .isArray({ min: 1 })
    .withMessage('Layout must have at least one zone'),
  
  body('layout.resolution')
    .isObject()
    .withMessage('Layout resolution must be an object'),
  
  body('layout.resolution.width')
    .isInt({ min: 1 })
    .withMessage('Resolution width must be a positive integer'),
  
  body('layout.resolution.height')
    .isInt({ min: 1 })
    .withMessage('Resolution height must be a positive integer'),
  
  handleValidationErrors
];