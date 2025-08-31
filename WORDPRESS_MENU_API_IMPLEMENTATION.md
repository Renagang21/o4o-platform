# WordPress Menu System API Implementation Guide

## Overview
WordPress 스타일 메뉴 시스템의 백엔드 구현 가이드입니다. 아코디언 UI와 고급 설정을 지원하는 메뉴 관리 API를 구현합니다.

## Database Schema

### 1. Menu Entity (기본 메뉴)
```typescript
// apps/api-server/src/entities/Menu.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MenuItem } from './MenuItem';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  location?: string; // primary, footer, mobile, social

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    cssClass?: string;
    autoAdd?: boolean; // 새 페이지 자동 추가
    displayDepth?: number; // 표시할 메뉴 깊이
  };

  @OneToMany(() => MenuItem, item => item.menu, { cascade: true })
  items: MenuItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. MenuItem Entity (메뉴 항목 - 고급 설정 포함)
```typescript
// apps/api-server/src/entities/MenuItem.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Tree, TreeChildren, TreeParent, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Menu } from './Menu';

export enum MenuItemType {
  PAGE = 'page',
  POST = 'post',
  CUSTOM = 'custom',
  CATEGORY = 'category',
  TAG = 'tag',
  ARCHIVE = 'archive'
}

export enum MenuItemTarget {
  SELF = '_self',
  BLANK = '_blank',
  PARENT = '_parent',
  TOP = '_top'
}

export enum MenuItemVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PROTECTED = 'protected'
}

@Entity('menu_items')
@Tree('closure-table')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  url?: string;

  @Column({
    type: 'enum',
    enum: MenuItemType,
    default: MenuItemType.CUSTOM
  })
  type: MenuItemType;

  @Column({
    type: 'enum',
    enum: MenuItemTarget,
    default: MenuItemTarget.SELF
  })
  target: MenuItemTarget;

  @Column({
    type: 'enum',
    enum: MenuItemVisibility,
    default: MenuItemVisibility.PUBLIC
  })
  visibility: MenuItemVisibility;

  // 고급 설정 필드들
  @Column({ nullable: true })
  titleAttribute?: string; // HTML title attribute

  @Column({ nullable: true })
  cssClass?: string; // CSS classes

  @Column({ nullable: true })
  linkRelationship?: string; // rel attribute (nofollow, noopener, etc.)

  @Column({ type: 'text', nullable: true })
  description?: string; // 메뉴 항목 설명

  @Column({ nullable: true })
  iconClass?: string; // 아이콘 클래스

  @Column({ nullable: true })
  badge?: string; // 배지 텍스트 (예: "NEW", "HOT")

  @Column({ nullable: true })
  badgeColor?: string; // 배지 색상

  // 권한 관련
  @Column({ type: 'simple-array', nullable: true })
  requiredRoles?: string[]; // 필요한 역할

  @Column({ type: 'simple-array', nullable: true })
  excludedRoles?: string[]; // 제외할 역할

  // 참조 ID (페이지, 포스트 등)
  @Column({ nullable: true })
  originalId?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => Menu, menu => menu.items, { onDelete: 'CASCADE' })
  menu: Menu;

  @TreeChildren()
  children: MenuItem[];

  @TreeParent()
  parent: MenuItem;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3. MenuLocation Entity (메뉴 위치)
```typescript
// apps/api-server/src/entities/MenuLocation.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('menu_locations')
export class MenuLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // primary, footer, mobile, etc.

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  maxDepth?: number; // 최대 메뉴 깊이

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

## API Controllers

### Menu Controller
```typescript
// apps/api-server/src/controllers/menuController.ts
import { Request, Response } from 'express';
import { getRepository, getTreeRepository } from 'typeorm';
import { Menu } from '../entities/Menu';
import { MenuItem } from '../entities/MenuItem';
import { MenuLocation } from '../entities/MenuLocation';

export const menuController = {
  // 메뉴 목록 조회
  async getMenus(req: Request, res: Response) {
    try {
      const menuRepo = getRepository(Menu);
      const menus = await menuRepo.find({
        relations: ['items'],
        order: { createdAt: 'DESC' }
      });

      res.json({
        success: true,
        data: menus
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menus'
      });
    }
  },

  // 메뉴 상세 조회 (트리 구조)
  async getMenu(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const menuRepo = getRepository(Menu);
      const itemRepo = getTreeRepository(MenuItem);

      const menu = await menuRepo.findOne(id);
      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }

      // 트리 구조로 메뉴 항목 조회
      const items = await itemRepo.findTrees({
        relations: ['menu'],
        where: { menu: { id } }
      });

      res.json({
        success: true,
        data: {
          ...menu,
          items
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu'
      });
    }
  },

  // 메뉴 생성
  async createMenu(req: Request, res: Response) {
    try {
      const { name, slug, description, location, items } = req.body;
      const menuRepo = getRepository(Menu);
      const itemRepo = getTreeRepository(MenuItem);

      // 슬러그 중복 확인
      const existing = await menuRepo.findOne({ where: { slug } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Menu slug already exists'
        });
      }

      // 메뉴 생성
      const menu = menuRepo.create({
        name,
        slug,
        description,
        location
      });

      const savedMenu = await menuRepo.save(menu);

      // 메뉴 항목 생성
      if (items && items.length > 0) {
        await createMenuItems(savedMenu, items, itemRepo);
      }

      res.status(201).json({
        success: true,
        data: savedMenu
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create menu'
      });
    }
  },

  // 메뉴 수정 (고급 설정 포함)
  async updateMenu(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, slug, description, location, items } = req.body;
      
      const menuRepo = getRepository(Menu);
      const itemRepo = getTreeRepository(MenuItem);

      const menu = await menuRepo.findOne(id);
      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }

      // 메뉴 정보 업데이트
      menu.name = name || menu.name;
      menu.slug = slug || menu.slug;
      menu.description = description;
      menu.location = location;

      await menuRepo.save(menu);

      // 기존 메뉴 항목 삭제
      await itemRepo.delete({ menu: { id } });

      // 새 메뉴 항목 생성
      if (items && items.length > 0) {
        await createMenuItems(menu, items, itemRepo);
      }

      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update menu'
      });
    }
  },

  // 메뉴 삭제
  async deleteMenu(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const menuRepo = getRepository(Menu);

      const result = await menuRepo.delete(id);
      
      if (result.affected === 0) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }

      res.json({
        success: true,
        message: 'Menu deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete menu'
      });
    }
  },

  // 메뉴 위치 목록 조회
  async getMenuLocations(req: Request, res: Response) {
    try {
      const locationRepo = getRepository(MenuLocation);
      const locations = await locationRepo.find({
        where: { isActive: true },
        order: { name: 'ASC' }
      });

      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu locations'
      });
    }
  },

  // 메뉴 항목 순서 변경
  async reorderMenuItems(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { items } = req.body; // 새로운 순서의 항목 ID 배열

      const itemRepo = getRepository(MenuItem);

      // 순서 업데이트
      for (let i = 0; i < items.length; i++) {
        await itemRepo.update(items[i].id, {
          order: i,
          parent: items[i].parentId ? { id: items[i].parentId } : null
        });
      }

      res.json({
        success: true,
        message: 'Menu items reordered successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to reorder menu items'
      });
    }
  },

  // 메뉴 항목 개별 수정 (고급 설정)
  async updateMenuItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const {
        title,
        url,
        type,
        target,
        visibility,
        titleAttribute,
        cssClass,
        linkRelationship,
        description,
        iconClass,
        badge,
        badgeColor,
        requiredRoles,
        excludedRoles
      } = req.body;

      const itemRepo = getRepository(MenuItem);
      const item = await itemRepo.findOne(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // 고급 설정 업데이트
      item.title = title || item.title;
      item.url = url;
      item.type = type || item.type;
      item.target = target || item.target;
      item.visibility = visibility || item.visibility;
      item.titleAttribute = titleAttribute;
      item.cssClass = cssClass;
      item.linkRelationship = linkRelationship;
      item.description = description;
      item.iconClass = iconClass;
      item.badge = badge;
      item.badgeColor = badgeColor;
      item.requiredRoles = requiredRoles;
      item.excludedRoles = excludedRoles;

      await itemRepo.save(item);

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update menu item'
      });
    }
  }
};

// Helper function to create menu items recursively
async function createMenuItems(menu: Menu, items: any[], itemRepo: any, parent: MenuItem | null = null) {
  for (let i = 0; i < items.length; i++) {
    const itemData = items[i];
    
    const item = itemRepo.create({
      title: itemData.title,
      url: itemData.url,
      type: itemData.type,
      target: itemData.target || '_self',
      visibility: itemData.visibility || 'public',
      titleAttribute: itemData.titleAttribute,
      cssClass: itemData.cssClass,
      linkRelationship: itemData.linkRelationship,
      description: itemData.description,
      iconClass: itemData.iconClass,
      badge: itemData.badge,
      badgeColor: itemData.badgeColor,
      requiredRoles: itemData.requiredRoles,
      excludedRoles: itemData.excludedRoles,
      originalId: itemData.originalId,
      order: i,
      menu,
      parent
    });

    const savedItem = await itemRepo.save(item);

    // 자식 항목 처리
    if (itemData.children && itemData.children.length > 0) {
      await createMenuItems(menu, itemData.children, itemRepo, savedItem);
    }
  }
}
```

### Menu Service (비즈니스 로직)
```typescript
// apps/api-server/src/services/menuService.ts
import { getRepository, getTreeRepository } from 'typeorm';
import { Menu } from '../entities/Menu';
import { MenuItem, MenuItemVisibility } from '../entities/MenuItem';

export const menuService = {
  // 사용자 권한에 따른 메뉴 필터링
  async getFilteredMenu(menuId: string, userRoles: string[] = []): Promise<MenuItem[]> {
    const itemRepo = getTreeRepository(MenuItem);
    const items = await itemRepo.findTrees({
      where: { menu: { id: menuId } }
    });

    return filterMenuItemsByRole(items, userRoles);
  },

  // 메뉴 렌더링용 데이터 생성
  async renderMenu(menuSlug: string, userRoles: string[] = []) {
    const menuRepo = getRepository(Menu);
    const menu = await menuRepo.findOne({
      where: { slug: menuSlug, isActive: true }
    });

    if (!menu) {
      return null;
    }

    const items = await this.getFilteredMenu(menu.id, userRoles);
    
    return {
      ...menu,
      items: buildMenuTree(items)
    };
  },

  // 메뉴 캐싱
  async getCachedMenu(menuSlug: string) {
    // Redis 캐싱 로직 구현
    // 캐시 키: `menu:${menuSlug}`
    // TTL: 1시간
    return null;
  },

  // 자동 메뉴 항목 추가 (새 페이지/포스트)
  async autoAddMenuItem(menu: Menu, page: any) {
    if (!menu.metadata?.autoAdd) {
      return;
    }

    const itemRepo = getRepository(MenuItem);
    const item = itemRepo.create({
      title: page.title,
      url: page.url,
      type: 'page',
      originalId: page.id,
      menu,
      order: 999 // 마지막에 추가
    });

    await itemRepo.save(item);
  },

  // 메뉴 복제
  async duplicateMenu(menuId: string, newName: string, newSlug: string) {
    const menuRepo = getRepository(Menu);
    const itemRepo = getTreeRepository(MenuItem);

    const originalMenu = await menuRepo.findOne(menuId);
    if (!originalMenu) {
      throw new Error('Original menu not found');
    }

    const items = await itemRepo.findTrees({
      where: { menu: { id: menuId } }
    });

    // 새 메뉴 생성
    const newMenu = menuRepo.create({
      name: newName,
      slug: newSlug,
      description: originalMenu.description,
      location: null, // 위치는 복제하지 않음
      metadata: originalMenu.metadata
    });

    const savedMenu = await menuRepo.save(newMenu);

    // 메뉴 항목 복제
    await duplicateMenuItems(savedMenu, items, itemRepo);

    return savedMenu;
  },

  // 메뉴 유효성 검사
  validateMenuStructure(items: MenuItem[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxDepth = 3;

    function checkDepth(items: MenuItem[], depth = 0) {
      if (depth > maxDepth) {
        errors.push(`Menu depth exceeds maximum of ${maxDepth} levels`);
      }
      
      items.forEach(item => {
        if (!item.title) {
          errors.push('Menu item missing title');
        }
        if (item.type === 'custom' && !item.url) {
          errors.push('Custom menu item missing URL');
        }
        if (item.children && item.children.length > 0) {
          checkDepth(item.children, depth + 1);
        }
      });
    }

    checkDepth(items);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

// Helper functions
function filterMenuItemsByRole(items: MenuItem[], userRoles: string[]): MenuItem[] {
  return items.filter(item => {
    // Public items are always visible
    if (item.visibility === MenuItemVisibility.PUBLIC) {
      return true;
    }

    // Private items require authentication
    if (item.visibility === MenuItemVisibility.PRIVATE && userRoles.length === 0) {
      return false;
    }

    // Check required roles
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      const hasRequiredRole = item.requiredRoles.some(role => userRoles.includes(role));
      if (!hasRequiredRole) {
        return false;
      }
    }

    // Check excluded roles
    if (item.excludedRoles && item.excludedRoles.length > 0) {
      const hasExcludedRole = item.excludedRoles.some(role => userRoles.includes(role));
      if (hasExcludedRole) {
        return false;
      }
    }

    // Filter children recursively
    if (item.children && item.children.length > 0) {
      item.children = filterMenuItemsByRole(item.children, userRoles);
    }

    return true;
  });
}

function buildMenuTree(items: MenuItem[]): any[] {
  const map = new Map();
  const tree: any[] = [];

  // Create map
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  // Build tree
  items.forEach(item => {
    const node = map.get(item.id);
    if (item.parent) {
      const parent = map.get(item.parent.id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      tree.push(node);
    }
  });

  return tree;
}

async function duplicateMenuItems(menu: Menu, items: MenuItem[], itemRepo: any, parent: MenuItem | null = null) {
  for (const item of items) {
    const newItem = itemRepo.create({
      title: item.title,
      url: item.url,
      type: item.type,
      target: item.target,
      visibility: item.visibility,
      titleAttribute: item.titleAttribute,
      cssClass: item.cssClass,
      linkRelationship: item.linkRelationship,
      description: item.description,
      iconClass: item.iconClass,
      badge: item.badge,
      badgeColor: item.badgeColor,
      requiredRoles: item.requiredRoles,
      excludedRoles: item.excludedRoles,
      originalId: item.originalId,
      order: item.order,
      menu,
      parent
    });

    const savedItem = await itemRepo.save(newItem);

    if (item.children && item.children.length > 0) {
      await duplicateMenuItems(menu, item.children, itemRepo, savedItem);
    }
  }
}
```

## API Routes
```typescript
// apps/api-server/src/routes/menu.routes.ts
import { Router } from 'express';
import { menuController } from '../controllers/menuController';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

const router = Router();

// Public routes
router.get('/menus/locations', menuController.getMenuLocations);

// Protected routes
router.use(authMiddleware);

// Menu CRUD
router.get('/menus', menuController.getMenus);
router.get('/menus/:id', menuController.getMenu);
router.post('/menus', roleMiddleware(['admin', 'editor']), menuController.createMenu);
router.put('/menus/:id', roleMiddleware(['admin', 'editor']), menuController.updateMenu);
router.delete('/menus/:id', roleMiddleware(['admin']), menuController.deleteMenu);

// Menu items
router.put('/menus/:id/reorder', roleMiddleware(['admin', 'editor']), menuController.reorderMenuItems);
router.put('/menu-items/:itemId', roleMiddleware(['admin', 'editor']), menuController.updateMenuItem);

export default router;
```

## Database Migrations
```sql
-- Create menus table
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  location VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create menu_items table with closure table for tree structure
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  url TEXT,
  type VARCHAR(20) DEFAULT 'custom',
  target VARCHAR(20) DEFAULT '_self',
  visibility VARCHAR(20) DEFAULT 'public',
  title_attribute VARCHAR(255),
  css_class VARCHAR(255),
  link_relationship VARCHAR(255),
  description TEXT,
  icon_class VARCHAR(100),
  badge VARCHAR(50),
  badge_color VARCHAR(20),
  required_roles TEXT[],
  excluded_roles TEXT[],
  original_id VARCHAR(255),
  "order" INTEGER DEFAULT 0,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create closure table for menu items hierarchy
CREATE TABLE menu_items_closure (
  id_ancestor UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  id_descendant UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (id_ancestor, id_descendant)
);

-- Create menu_locations table
CREATE TABLE menu_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_depth INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_menus_slug ON menus(slug);
CREATE INDEX idx_menus_location ON menus(location);
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id);
CREATE INDEX idx_menu_items_parent ON menu_items(parent_id);
CREATE INDEX idx_menu_items_order ON menu_items("order");
CREATE INDEX idx_menu_items_visibility ON menu_items(visibility);

-- Insert default menu locations
INSERT INTO menu_locations (key, name, description, max_depth) VALUES
('primary', '주 메뉴', '사이트 상단에 표시되는 메인 메뉴', 3),
('footer', '푸터 메뉴', '사이트 하단에 표시되는 메뉴', 2),
('mobile', '모바일 메뉴', '모바일 기기에서 표시되는 메뉴', 3),
('social', '소셜 링크', '소셜 미디어 링크 메뉴', 1),
('sidebar', '사이드바 메뉴', '사이드바에 표시되는 메뉴', 2);
```

## Frontend Integration
```typescript
// API 호출 예제 (프론트엔드)

// 메뉴 생성/수정 시 보낼 데이터 구조
const menuData = {
  name: "주 메뉴",
  slug: "primary-menu",
  description: "사이트의 주요 네비게이션 메뉴",
  location: "primary",
  items: [
    {
      title: "홈",
      url: "/",
      type: "page",
      target: "_self",
      visibility: "public",
      titleAttribute: "홈페이지로 이동",
      cssClass: "menu-home",
      linkRelationship: "",
      description: "사이트 메인 페이지",
      order: 0,
      children: []
    },
    {
      title: "회사 소개",
      url: "/about",
      type: "page",
      target: "_self",
      visibility: "public",
      titleAttribute: "회사 소개 페이지",
      cssClass: "menu-about dropdown",
      linkRelationship: "",
      description: "우리 회사에 대해 알아보기",
      order: 1,
      children: [
        {
          title: "연혁",
          url: "/about/history",
          type: "page",
          target: "_self",
          visibility: "public",
          order: 0
        }
      ]
    }
  ]
};

// API 호출
await fetch('/api/menus', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(menuData)
});
```

## 캐싱 전략
```typescript
// Redis 캐싱 구현
import Redis from 'ioredis';

const redis = new Redis();

// 메뉴 캐싱
async function cacheMenu(menuSlug: string, menuData: any) {
  const key = `menu:${menuSlug}`;
  await redis.set(key, JSON.stringify(menuData), 'EX', 3600); // 1시간
}

// 캐시 무효화
async function invalidateMenuCache(menuSlug: string) {
  const key = `menu:${menuSlug}`;
  await redis.del(key);
}
```

## Testing Checklist
- [ ] 메뉴 CRUD 작업
- [ ] 메뉴 항목 트리 구조 생성/수정
- [ ] 드래그 앤 드롭 순서 변경
- [ ] 고급 설정 저장 (linkRelationship, description 등)
- [ ] 권한 기반 메뉴 필터링
- [ ] 메뉴 복제 기능
- [ ] 캐싱 및 성능 테스트

## Performance Optimizations
1. **트리 구조 최적화**: Closure table 사용
2. **캐싱**: Redis로 렌더링된 메뉴 캐싱
3. **Lazy Loading**: 대량 메뉴 항목 처리
4. **인덱싱**: 자주 조회되는 컬럼에 인덱스 추가

## Security Considerations
1. **XSS 방지**: 메뉴 제목, URL 살균
2. **권한 검증**: 역할 기반 메뉴 수정 제한
3. **URL 검증**: 악성 URL 방지
4. **Rate Limiting**: 메뉴 생성/수정 제한