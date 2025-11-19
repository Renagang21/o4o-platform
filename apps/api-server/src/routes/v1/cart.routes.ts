import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Cart } from '../../entities/Cart.js';
import { CartItem } from '../../entities/CartItem.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router: Router = Router();

/**
 * GET /api/v1/cart
 * Get current user's cart
 * Supports both authenticated users (via token) and guest users (via session)
 */
router.get('/', async (req, res) => {
  try {
    const cartRepository = AppDataSource.getRepository(Cart);
    const user = (req as any).user; // From authenticateToken middleware if present
    const sessionId = req.sessionID || (req.headers['x-session-id'] as string);

    let cart: Cart | null = null;

    // Try to find cart by user ID if authenticated
    if (user && user.id) {
      cart = await cartRepository.findOne({
        where: { userId: user.id },
        relations: ['items']
      });
    }
    // Otherwise, try to find guest cart by session ID
    else if (sessionId) {
      cart = await cartRepository.findOne({
        where: { sessionId },
        relations: ['items']
      });
    }

    // If no cart found, return empty cart
    if (!cart) {
      return res.json({
        success: true,
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          shipping: 0,
          tax: 0,
          grand: 0
        },
        totalItems: 0
      });
    }

    // Calculate totals
    cart.updateSummary();
    const summary = cart.summary || cart.calculateSummary();
    const totalItems = cart.getTotalItems();

    // Format items for response
    const formattedItems = (cart.items || []).map((item: CartItem) => ({
      id: item.id,
      title: item.productName,
      thumbnail: item.productImage,
      qty: item.quantity,
      price: item.unitPrice,
      variant: item.variationName || null,
      productId: item.productId,
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      totalPrice: item.getTotalPrice()
    }));

    // Cache for 60 seconds (cart data changes frequently)
    res.set('Cache-Control', 'private, max-age=60');

    res.json({
      success: true,
      cart: {
        id: cart.id,
        userId: cart.userId,
        sessionId: cart.sessionId
      },
      items: formattedItems,
      totals: {
        subtotal: summary.subtotal,
        shipping: summary.shipping,
        tax: summary.tax,
        grand: summary.total
      },
      totalItems
    });
  } catch (error: any) {
    console.error('[Cart] Fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch cart'
    });
  }
});

/**
 * POST /api/v1/cart/items
 * Add item to cart
 */
router.post('/items', async (req, res) => {
  try {
    const { productId, quantity = 1, variationId, unitPrice } = req.body;

    if (!productId || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, unitPrice'
      });
    }

    const cartRepository = AppDataSource.getRepository(Cart);
    const cartItemRepository = AppDataSource.getRepository(CartItem);
    const user = (req as any).user;
    const sessionId = req.sessionID || (req.headers['x-session-id'] as string);

    // Find or create cart
    let cart: Cart | null = null;

    if (user && user.id) {
      cart = await cartRepository.findOne({
        where: { userId: user.id },
        relations: ['items']
      });

      if (!cart) {
        cart = cartRepository.create({
          userId: user.id,
          sessionId: sessionId || undefined
        });
        cart = await cartRepository.save(cart);
      }
    } else if (sessionId) {
      cart = await cartRepository.findOne({
        where: { sessionId },
        relations: ['items']
      });

      if (!cart) {
        // Create guest cart (no userId)
        cart = cartRepository.create({
          sessionId,
          userId: null as any // Guest cart
        });
        cart = await cartRepository.save(cart);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'No user session or authentication found'
      });
    }

    // Check if item already exists in cart
    const existingItem = cart.items?.find(
      item => item.productId === productId &&
              (variationId ? item.variationId === variationId : true)
    );

    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
      await cartItemRepository.save(existingItem);
    } else {
      // Add new item
      const newItem = cartItemRepository.create({
        cartId: cart.id,
        productId,
        variationId: variationId || null,
        quantity,
        unitPrice,
        addedAt: new Date()
      });
      await cartItemRepository.save(newItem);
    }

    // Reload cart with items
    cart = await cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items']
    });

    cart!.updateSummary();
    await cartRepository.save(cart!);

    res.json({
      success: true,
      message: 'Item added to cart',
      totalItems: cart!.getTotalItems()
    });
  } catch (error: any) {
    console.error('[Cart] Add item error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add item to cart'
    });
  }
});

export default router;
