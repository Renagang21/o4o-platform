-- Create categories table for posts
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    description TEXT,
    image VARCHAR,
    "sortOrder" INT DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "metaTitle" VARCHAR,
    "metaDescription" TEXT,
    count INT DEFAULT 0,
    nsleft INT DEFAULT 1,
    nsright INT DEFAULT 2,
    "parentId" UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_CATEGORY_PARENT FOREIGN KEY ("parentId") REFERENCES categories(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS IDX_CATEGORY_SLUG ON categories(slug);
CREATE INDEX IF NOT EXISTS IDX_CATEGORY_PARENT ON categories("parentId");
CREATE INDEX IF NOT EXISTS IDX_CATEGORY_NESTED_SET ON categories(nsleft, nsright);

-- Insert default categories
INSERT INTO categories (name, slug, description, "sortOrder") VALUES 
('미분류', 'uncategorized', '분류되지 않은 글', 0),
('공지사항', 'notices', '중요 공지사항', 1),
('뉴스', 'news', '최신 뉴스 및 소식', 2),
('기술', 'tech', '기술 관련 글', 3),
('비즈니스', 'business', '비즈니스 및 경영', 4),
('라이프스타일', 'lifestyle', '일상과 라이프스타일', 5),
('교육', 'education', '교육 및 학습 자료', 6),
('엔터테인먼트', 'entertainment', '엔터테인먼트 콘텐츠', 7),
('건강', 'health', '건강 및 웰빙', 8),
('여행', 'travel', '여행 정보 및 가이드', 9)
ON CONFLICT (slug) DO NOTHING;

-- Update migration history
INSERT INTO typeorm_migrations (id, timestamp, name) 
VALUES (8, 1760000000000, 'CreateCategoriesTable1760000000000')
ON CONFLICT DO NOTHING;