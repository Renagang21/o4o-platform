"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Mock data for menus
const mockMenus = [
    {
        id: '1',
        name: 'Main Menu',
        slug: 'main-menu',
        description: 'Main navigation menu',
        locations: ['primary', 'header'],
        items: [
            {
                id: '1',
                title: 'Home',
                url: '/',
                type: 'custom',
                object_id: null,
                parent: null,
                order: 1
            },
            {
                id: '2',
                title: 'About',
                url: '/about',
                type: 'page',
                object_id: '1',
                parent: null,
                order: 2
            },
            {
                id: '3',
                title: 'Blog',
                url: '/blog',
                type: 'custom',
                object_id: null,
                parent: null,
                order: 3
            },
            {
                id: '4',
                title: 'Contact',
                url: '/contact',
                type: 'page',
                object_id: '2',
                parent: null,
                order: 4
            }
        ],
        auto_add: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: '2',
        name: 'Footer Menu',
        slug: 'footer-menu',
        description: 'Footer navigation menu',
        locations: ['footer'],
        items: [
            {
                id: '5',
                title: 'Privacy Policy',
                url: '/privacy',
                type: 'page',
                object_id: '3',
                parent: null,
                order: 1
            },
            {
                id: '6',
                title: 'Terms of Service',
                url: '/terms',
                type: 'page',
                object_id: '4',
                parent: null,
                order: 2
            }
        ],
        auto_add: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
// GET /api/v1/menus - Get all menus
router.get('/', async (req, res) => {
    try {
        const { location } = req.query;
        let menus = [...mockMenus];
        // Filter by location if specified
        if (location) {
            menus = menus.filter(menu => menu.locations.includes(location));
        }
        res.json({
            success: true,
            data: menus
        });
    }
    catch (error) {
        console.error('Error fetching menus:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menus',
            message: error.message
        });
    }
});
// GET /api/v1/menus/:id - Get single menu
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const menu = mockMenus.find(m => m.id === id || m.slug === id);
        if (!menu) {
            return res.status(404).json({
                success: false,
                error: 'Menu not found'
            });
        }
        res.json({
            success: true,
            data: menu
        });
    }
    catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu',
            message: error.message
        });
    }
});
// POST /api/v1/menus - Create menu (requires auth)
router.post('/', async (req, res) => {
    try {
        const { name, slug, description, locations, items } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Menu name is required'
            });
        }
        const newMenu = {
            id: Date.now().toString(),
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            description: description || '',
            locations: locations || [],
            items: items || [],
            auto_add: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        mockMenus.push(newMenu);
        res.status(201).json({
            success: true,
            data: newMenu,
            message: 'Menu created successfully'
        });
    }
    catch (error) {
        console.error('Error creating menu:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create menu',
            message: error.message
        });
    }
});
// PUT /api/v1/menus/:id - Update menu
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, locations, items } = req.body;
        const menuIndex = mockMenus.findIndex(m => m.id === id);
        if (menuIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Menu not found'
            });
        }
        mockMenus[menuIndex] = {
            ...mockMenus[menuIndex],
            name: name || mockMenus[menuIndex].name,
            slug: slug || mockMenus[menuIndex].slug,
            description: description !== undefined ? description : mockMenus[menuIndex].description,
            locations: locations || mockMenus[menuIndex].locations,
            items: items || mockMenus[menuIndex].items,
            updatedAt: new Date().toISOString()
        };
        res.json({
            success: true,
            data: mockMenus[menuIndex],
            message: 'Menu updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating menu:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update menu',
            message: error.message
        });
    }
});
// DELETE /api/v1/menus/:id - Delete menu
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const menuIndex = mockMenus.findIndex(m => m.id === id);
        if (menuIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Menu not found'
            });
        }
        const deletedMenu = mockMenus.splice(menuIndex, 1)[0];
        res.json({
            success: true,
            data: deletedMenu,
            message: 'Menu deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting menu:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete menu',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=menus.js.map