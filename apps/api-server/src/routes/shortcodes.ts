import { Router } from 'express';

const router = Router();

// Placeholder shortcode routes
// TODO: Implement shortcode functionality

router.get('/', (req, res) => {
  res.json({ message: 'Shortcode routes placeholder' });
});

export default router;