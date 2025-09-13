import { Router } from 'express';

const router = Router();

// Placeholder v1 shortcode routes
// TODO: Implement shortcode functionality

router.get('/', (req, res) => {
  res.json({ message: 'V1 Shortcode routes placeholder' });
});

export default router;