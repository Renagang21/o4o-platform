import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-COMMUNITY-INDUSTRY-NEWS-V2 §4 — candidate ledger and anonymous engagement aggregate.
 * Both tables are community-only. No foreign keys on purpose: the ledger (90 days) must not take the
 * aggregate (1 year) with it, and cms_contents stays untouched (Core freeze).
 */
export class CreateCommunityNewsAutomation1794013771244 implements MigrationInterface {
  name = 'CreateCommunityNewsAutomation1794013771244';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE community_news_articles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source varchar(20) NOT NULL CHECK (source IN ('kpanews','dailypharm','medipana')),
      url varchar(500) NOT NULL,
      title varchar(160) NOT NULL,
      lead varchar(240) NOT NULL DEFAULT '',
      section varchar(100) NULL,
      published_at timestamptz NOT NULL,
      collected_at timestamptz NOT NULL DEFAULT NOW(),
      day date NOT NULL,
      cluster_key uuid NULL,
      ai_score smallint NULL CHECK (ai_score BETWEEN 0 AND 100),
      ai_reason varchar(160) NULL,
      representative boolean NOT NULL DEFAULT false,
      published_content_id uuid NULL,
      CONSTRAINT uq_community_news_articles_url UNIQUE (url)
    )`);
    await queryRunner.query(`CREATE INDEX idx_community_news_articles_published ON community_news_articles (published_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_community_news_articles_collected ON community_news_articles (collected_at)`);
    await queryRunner.query(`CREATE INDEX idx_community_news_articles_cluster ON community_news_articles (cluster_key) WHERE cluster_key IS NOT NULL`);
    await queryRunner.query(`CREATE TABLE community_news_engagement_daily (
      article_id uuid NOT NULL,
      day date NOT NULL,
      "position" smallint NOT NULL CHECK ("position" BETWEEN 1 AND 12),
      impressions integer NOT NULL DEFAULT 0 CHECK (impressions >= 0),
      clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
      PRIMARY KEY (article_id, day, "position")
    )`);
    await queryRunner.query(`CREATE INDEX idx_community_news_engagement_day ON community_news_engagement_daily (day)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE community_news_engagement_daily`);
    await queryRunner.query(`DROP TABLE community_news_articles`);
  }
}
