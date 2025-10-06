-- Test TemplatePart Data for Subdomain/Path Filtering
-- Created: 2025-10-06

-- 1. Global Header (no conditions)
INSERT INTO template_parts (id, name, slug, description, area, content, settings, is_active, is_default, author_id, priority, tags, conditions, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Global Header',
   'global-header',
   'Default header for all contexts',
   'header',
   '[
     {
       "id": "global-header-block-1",
       "type": "core/group",
       "data": {"content": "Global Site Header"},
       "attributes": {"className": "global-header"}
     }
   ]'::json,
   '{
     "containerWidth": "full",
     "backgroundColor": "#ffffff",
     "textColor": "#000000"
   }'::json,
   true,
   true,
   NULL,
   0,
   ARRAY['global', 'header'],
   NULL,
   NOW(),
   NOW());

-- 2. Shop Header (subdomain: "shop")
INSERT INTO template_parts (id, name, slug, description, area, content, settings, is_active, is_default, author_id, priority, tags, conditions, created_at, updated_at)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Shop Header',
   'shop-header',
   'Header for shop subdomain',
   'header',
   '[
     {
       "id": "shop-header-block-1",
       "type": "core/group",
       "data": {"content": "Shop Header - Welcome to our Store!"},
       "attributes": {"className": "shop-header"}
     }
   ]'::json,
   '{
     "containerWidth": "full",
     "backgroundColor": "#4CAF50",
     "textColor": "#ffffff"
   }'::json,
   true,
   false,
   NULL,
   10,
   ARRAY['shop', 'header'],
   '{"subdomain": "shop"}'::json,
   NOW(),
   NOW());

-- 3. Forum Header (subdomain: "forum")
INSERT INTO template_parts (id, name, slug, description, area, content, settings, is_active, is_default, author_id, priority, tags, conditions, created_at, updated_at)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Forum Header',
   'forum-header',
   'Header for forum subdomain',
   'header',
   '[
     {
       "id": "forum-header-block-1",
       "type": "core/group",
       "data": {"content": "Forum Header - Community Discussions"},
       "attributes": {"className": "forum-header"}
     }
   ]'::json,
   '{
     "containerWidth": "full",
     "backgroundColor": "#2196F3",
     "textColor": "#ffffff"
   }'::json,
   true,
   false,
   NULL,
   10,
   ARRAY['forum', 'header'],
   '{"subdomain": "forum"}'::json,
   NOW(),
   NOW());

-- 4. Shop Footer (subdomain: "shop")
INSERT INTO template_parts (id, name, slug, description, area, content, settings, is_active, is_default, author_id, priority, tags, conditions, created_at, updated_at)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Shop Footer',
   'shop-footer',
   'Footer for shop subdomain',
   'footer',
   '[
     {
       "id": "shop-footer-block-1",
       "type": "core/group",
       "data": {"content": "Shop Footer - Customer Service | Shipping Info | Returns"},
       "attributes": {"className": "shop-footer"}
     }
   ]'::json,
   '{
     "containerWidth": "full",
     "backgroundColor": "#333333",
     "textColor": "#ffffff"
   }'::json,
   true,
   false,
   NULL,
   10,
   ARRAY['shop', 'footer'],
   '{"subdomain": "shop"}'::json,
   NOW(),
   NOW());
