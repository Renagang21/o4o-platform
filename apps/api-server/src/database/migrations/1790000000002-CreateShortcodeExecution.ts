import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShortcodeExecution1790000000002 implements MigrationInterface {
  name = 'CreateShortcodeExecution1790000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create execution status enum
    await queryRunner.query(`
      CREATE TYPE "public"."shortcode_executions_status_enum" AS ENUM('success', 'error', 'timeout', 'cached')
    `);

    // Create execution context enum
    await queryRunner.query(`
      CREATE TYPE "public"."shortcode_executions_context_enum" AS ENUM('post', 'page', 'widget', 'api', 'preview', 'email')
    `);

    // Create shortcode_executions table
    await queryRunner.query(`
      CREATE TABLE "shortcode_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shortcode_id" uuid NOT NULL,
        "user_id" uuid,
        "raw_content" text NOT NULL,
        "parsed_attributes" jsonb,
        "rendered_content" text,
        "status" "public"."shortcode_executions_status_enum" NOT NULL DEFAULT 'success',
        "context" "public"."shortcode_executions_context_enum" NOT NULL DEFAULT 'post',
        "context_id" character varying(255),
        "error_message" text,
        "error_details" jsonb,
        "execution_time_ms" integer,
        "memory_usage_bytes" integer,
        "ip_address" character varying(50),
        "user_agent" character varying(255),
        "referer" character varying(255),
        "metadata" jsonb,
        "from_cache" boolean NOT NULL DEFAULT false,
        "cache_key" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shortcode_executions" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_shortcode_executions_shortcode_created" ON "shortcode_executions" ("shortcode_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_shortcode_executions_user_created" ON "shortcode_executions" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_shortcode_executions_status_created" ON "shortcode_executions" ("status", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_shortcode_executions_context_created" ON "shortcode_executions" ("context", "created_at")`);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "shortcode_executions" 
      ADD CONSTRAINT "FK_shortcode_executions_shortcode" 
      FOREIGN KEY ("shortcode_id") REFERENCES "shortcodes"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "shortcode_executions" 
      ADD CONSTRAINT "FK_shortcode_executions_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Insert default shortcodes
    await queryRunner.query(`
      INSERT INTO "shortcodes" (
        "appId", "name", "displayName", "description", "category", 
        "icon", "selfClosing", "status", "isVisible", "renderFunction",
        "attributes", "examples", "defaultContent", "tags"
      ) VALUES
      -- Gallery Shortcode
      (
        'core', 
        'gallery', 
        'Image Gallery', 
        'Display a responsive image gallery',
        'media',
        'image',
        true,
        'active',
        true,
        'renderGallery',
        '[
          {"name": "ids", "type": "string", "required": false, "description": "Comma-separated list of image IDs"},
          {"name": "columns", "type": "number", "required": false, "default": 3, "description": "Number of columns"},
          {"name": "size", "type": "select", "required": false, "default": "medium", "options": ["thumbnail", "medium", "large", "full"], "description": "Image size"},
          {"name": "link", "type": "select", "required": false, "default": "none", "options": ["none", "file", "post"], "description": "Link type"}
        ]'::jsonb,
        '[
          {"title": "Basic Gallery", "code": "[gallery ids="1,2,3,4" columns="4"]", "description": "4-column gallery with specific images"},
          {"title": "Two Column Gallery", "code": "[gallery columns="2" size="large"]", "description": "2-column gallery with large images"}
        ]'::jsonb,
        null,
        '["media", "images", "gallery", "photos"]'::jsonb
      ),
      -- Button Shortcode
      (
        'core',
        'button',
        'Button',
        'Create a styled button with various options',
        'content',
        'mouse-pointer',
        false,
        'active',
        true,
        'renderButton',
        '[
          {"name": "url", "type": "url", "required": true, "description": "Button link URL"},
          {"name": "style", "type": "select", "required": false, "default": "primary", "options": ["primary", "secondary", "success", "danger", "warning", "info"], "description": "Button style"},
          {"name": "size", "type": "select", "required": false, "default": "medium", "options": ["small", "medium", "large"], "description": "Button size"},
          {"name": "target", "type": "select", "required": false, "default": "_self", "options": ["_self", "_blank"], "description": "Link target"},
          {"name": "icon", "type": "string", "required": false, "description": "Icon class"}
        ]'::jsonb,
        '[
          {"title": "Primary Button", "code": "[button url="/contact" style="primary"]Contact Us[/button]", "description": "Primary styled button"},
          {"title": "Large Success Button", "code": "[button url="/signup" style="success" size="large"]Sign Up Now[/button]", "description": "Large green button"}
        ]'::jsonb,
        'Click Here',
        '["button", "link", "cta", "action"]'::jsonb
      ),
      -- Quote Shortcode
      (
        'core',
        'quote',
        'Quote Block',
        'Display a styled quotation with optional author',
        'content',
        'quote-left',
        false,
        'active',
        true,
        'renderQuote',
        '[
          {"name": "author", "type": "string", "required": false, "description": "Quote author"},
          {"name": "source", "type": "string", "required": false, "description": "Quote source or citation"},
          {"name": "style", "type": "select", "required": false, "default": "default", "options": ["default", "pullquote", "blockquote"], "description": "Quote style"},
          {"name": "align", "type": "select", "required": false, "default": "left", "options": ["left", "center", "right"], "description": "Text alignment"}
        ]'::jsonb,
        '[
          {"title": "Simple Quote", "code": "[quote author="Albert Einstein"]Imagination is more important than knowledge.[/quote]", "description": "Quote with author"},
          {"title": "Pullquote", "code": "[quote style="pullquote" align="center"]This is a highlighted quote[/quote]", "description": "Centered pullquote"}
        ]'::jsonb,
        'Enter your quote here',
        '["quote", "blockquote", "citation", "testimonial"]'::jsonb
      ),
      -- Video Shortcode
      (
        'core',
        'video',
        'Video Embed',
        'Embed videos from various sources',
        'media',
        'video',
        true,
        'active',
        true,
        'renderVideo',
        '[
          {"name": "url", "type": "url", "required": true, "description": "Video URL (YouTube, Vimeo, or direct video file)"},
          {"name": "width", "type": "string", "required": false, "default": "100%", "description": "Video width"},
          {"name": "height", "type": "string", "required": false, "default": "auto", "description": "Video height"},
          {"name": "autoplay", "type": "boolean", "required": false, "default": false, "description": "Auto-play video"},
          {"name": "controls", "type": "boolean", "required": false, "default": true, "description": "Show video controls"},
          {"name": "loop", "type": "boolean", "required": false, "default": false, "description": "Loop video"}
        ]'::jsonb,
        '[
          {"title": "YouTube Video", "code": "[video url="https://youtube.com/watch?v=dQw4w9WgXcQ"]", "description": "Embed YouTube video"},
          {"title": "Autoplay Video", "code": "[video url="video.mp4" autoplay="true" loop="true"]", "description": "Autoplay looped video"}
        ]'::jsonb,
        null,
        '["video", "youtube", "vimeo", "embed", "media"]'::jsonb
      ),
      -- Menu Shortcode
      (
        'core',
        'menu',
        'Navigation Menu',
        'Display a navigation menu by location',
        'widget',
        'bars',
        true,
        'active',
        true,
        'renderMenu',
        '[
          {"name": "location", "type": "select", "required": false, "default": "primary", "options": ["primary", "footer", "mobile", "sidebar"], "description": "Menu location"},
          {"name": "style", "type": "select", "required": false, "default": "horizontal", "options": ["horizontal", "vertical", "dropdown"], "description": "Menu style"},
          {"name": "depth", "type": "number", "required": false, "default": 3, "description": "Maximum menu depth"},
          {"name": "class", "type": "string", "required": false, "description": "Additional CSS classes"}
        ]'::jsonb,
        '[
          {"title": "Primary Menu", "code": "[menu location="primary"]", "description": "Display primary navigation"},
          {"title": "Vertical Footer Menu", "code": "[menu location="footer" style="vertical"]", "description": "Vertical footer menu"}
        ]'::jsonb,
        null,
        '["menu", "navigation", "nav", "links"]'::jsonb
      ),
      -- Contact Form Shortcode
      (
        'core',
        'contact',
        'Contact Form',
        'Display a contact form',
        'form',
        'envelope',
        true,
        'active',
        true,
        'renderContactForm',
        '[
          {"name": "to", "type": "string", "required": false, "description": "Recipient email address"},
          {"name": "subject", "type": "string", "required": false, "default": "Contact Form Submission", "description": "Email subject"},
          {"name": "success_message", "type": "string", "required": false, "default": "Thank you for your message!", "description": "Success message"},
          {"name": "button_text", "type": "string", "required": false, "default": "Send Message", "description": "Submit button text"}
        ]'::jsonb,
        '[
          {"title": "Basic Contact Form", "code": "[contact to="info@example.com"]", "description": "Simple contact form"},
          {"title": "Custom Contact Form", "code": "[contact to="sales@example.com" subject="Sales Inquiry" button_text="Request Quote"]", "description": "Customized form"}
        ]'::jsonb,
        null,
        '["contact", "form", "email", "message"]'::jsonb
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "shortcode_executions" DROP CONSTRAINT "FK_shortcode_executions_user"`);
    await queryRunner.query(`ALTER TABLE "shortcode_executions" DROP CONSTRAINT "FK_shortcode_executions_shortcode"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_shortcode_executions_context_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_shortcode_executions_status_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_shortcode_executions_user_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_shortcode_executions_shortcode_created"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "shortcode_executions"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."shortcode_executions_context_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shortcode_executions_status_enum"`);

    // Remove default shortcodes
    await queryRunner.query(`DELETE FROM "shortcodes" WHERE "appId" = 'core'`);
  }
}