#!/usr/bin/env python3
import requests
import json
import sys

# Configuration
API_BASE_URL = "http://localhost:4000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwYWVhYTMyMC1kZjIxLTRhOGItYTE2My01MzgxNDllNDIwYzIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjExMzE3NDQsImV4cCI6MTc2MTE0NjE0NH0.qL24p7BGHLLjb5Kl4JvEcHBJ5N6z9hJU5n3OzBCvYTw"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

MEDIA_FILES = [
    {"filename": "intro-overview.md", "title": "O4O 플랫폼 소개 (드랍쉬핑 실체 중심)", "slug": "o4o-platform-intro-overview", "mediaFileId": "1761104916-hk5xxpirs.md"},
    {"filename": "partner-overview.md", "title": "O4O 파트너 협력 개요", "slug": "o4o-platform-partner-overview", "mediaFileId": "1761108522-9adf0e29.md"},
    {"filename": "dropshipping-user-manual.md", "title": "드랍쉬핑 플랫폼 사용자 매뉴얼", "slug": "manual-dropshipping-user", "mediaFileId": "1761132706029-anp0dhfly.md"},
    {"filename": "admin-manual.md", "title": "관리자 대시보드 매뉴얼", "slug": "manual-admin-dashboard", "mediaFileId": "1761131811781-8ocibdxy0.md"},
    {"filename": "editor-usage-manual.md", "title": "O4O 편집기 사용 매뉴얼", "slug": "manual-editor-usage", "mediaFileId": "1761132123499-tqd4v3ih2.md"},
    {"filename": "appearance-template-parts.md", "title": "외모 → 템플릿 파트 매뉴얼", "slug": "manual-appearance-template-parts", "mediaFileId": "1759968997274-uvehjtc0b.md"},
    {"filename": "appearance-menus.md", "title": "외모 → 메뉴 매뉴얼", "slug": "manual-appearance-menus", "mediaFileId": "1759968997243-n6cs0jnj1.md"},
    {"filename": "appearance-customize.md", "title": "외모 → 커스터마이즈 매뉴얼", "slug": "manual-appearance-customize", "mediaFileId": "1759968997211-79q3vkw46.md"},
    {"filename": "blocks-reference.md", "title": "블록 레퍼런스 (요약판)", "slug": "editor-blocks-reference", "mediaFileId": "1761132105615-yzx3myzk8.md"},
    {"filename": "blocks-reference-detailed.md", "title": "블록 상세 레퍼런스", "slug": "editor-blocks-reference-detailed", "mediaFileId": "1761132087680-oaqi79v8t.md"},
    {"filename": "shortcodes-reference.md", "title": "Shortcode 레퍼런스", "slug": "editor-shortcodes-reference", "mediaFileId": "1761132646610-5yjsunhwi.md"},
    {"filename": "ai-user-guide.md", "title": "AI 사용자 가이드", "slug": "ai-user-guide", "mediaFileId": "1761132065588-ikhg4eopm.md"},
    {"filename": "ai-technical-guide.md", "title": "AI 기술 가이드", "slug": "ai-technical-guide", "mediaFileId": "1761131979611-30zyxloen.md"},
    {"filename": "ai-page-generation.md", "title": "AI 페이지 생성 가이드", "slug": "ai-page-generation", "mediaFileId": "1761131926978-ucg4alq8e.md"},
    {"filename": "README.md", "title": "매뉴얼 문서 목차", "slug": "system-readme", "mediaFileId": "1761131744055-g5422jtpt.md"},
]

DUPLICATE_FILES_TO_DELETE = [
    "1759968997180-01q8tkyac.md",  # ai-page-generation.md (10월 9일)
    "1759968968859-bcya20v3b.md",  # ai-page-generation.md (10월 9일)
]

def delete_duplicate_media():
    print("\n=== Step 1: Deleting duplicate media files ===\n")

    # Get all media files
    response = requests.get(f"{API_BASE_URL}/media?per_page=200", headers=HEADERS)
    if response.status_code != 200:
        print(f"Error fetching media: {response.status_code} - {response.text}")
        return

    media_list = response.json().get("data", [])

    for filename in DUPLICATE_FILES_TO_DELETE:
        # Find media file by filename
        media_file = next((m for m in media_list if m["filename"] == filename), None)

        if media_file:
            # Delete the file
            delete_response = requests.delete(
                f"{API_BASE_URL}/media/{media_file['id']}",
                headers=HEADERS
            )

            if delete_response.status_code == 200:
                print(f"✓ Deleted: {filename} (ID: {media_file['id']})")
            else:
                print(f"✗ Failed to delete {filename}: {delete_response.text}")
        else:
            print(f"⚠ Not found: {filename}")

def create_markdown_posts():
    print("\n=== Step 2: Creating posts from markdown files ===\n")

    # Get all media files
    media_response = requests.get(f"{API_BASE_URL}/media?per_page=200", headers=HEADERS)
    if media_response.status_code != 200:
        print(f"Error fetching media: {media_response.status_code} - {media_response.text}")
        return {"createdPosts": [], "errors": []}

    media_list = media_response.json().get("data", [])

    # Get existing posts to check for duplicates
    posts_response = requests.get(f"{API_BASE_URL}/content/posts?per_page=200", headers=HEADERS)
    existing_posts = []
    if posts_response.status_code == 200:
        existing_posts = posts_response.json().get("data", {}).get("posts", [])

    created_posts = []
    errors = []

    for file_data in MEDIA_FILES:
        try:
            # Find the media file
            media_file = next((m for m in media_list if m["filename"] == file_data["mediaFileId"]), None)

            if not media_file:
                errors.append({
                    "file": file_data["filename"],
                    "error": f"Media file not found: {file_data['mediaFileId']}"
                })
                continue

            # Check if post already exists
            existing_post = next((p for p in existing_posts if p.get("slug") == file_data["slug"]), None)
            if existing_post:
                print(f"⚠ Post already exists with slug: {file_data['slug']}")
                continue

            # Create block content
            block_content = json.dumps([
                {
                    "type": "o4o/markdown-reader",
                    "attributes": {
                        "url": media_file["url"],
                        "theme": "github"
                    }
                }
            ])

            # Create post
            post_data = {
                "title": file_data["title"],
                "slug": file_data["slug"],
                "content": block_content,
                "excerpt": f"{file_data['title']} 문서를 확인하세요.",
                "status": "publish",
                "type": "post",
                "allowComments": False,
                "sticky": False
            }

            create_response = requests.post(
                f"{API_BASE_URL}/content/posts",
                headers=HEADERS,
                json=post_data
            )

            if create_response.status_code in [200, 201]:
                post = create_response.json().get("data", {}).get("post", {})
                created_posts.append({
                    "title": file_data["title"],
                    "slug": file_data["slug"],
                    "id": post.get("id")
                })

                print(f"✓ Created: {file_data['title']}")
                print(f"  - Slug: {file_data['slug']}")
                print(f"  - Media: {media_file['url']}")
                print(f"  - Post ID: {post.get('id')}\n")
            else:
                errors.append({
                    "file": file_data["filename"],
                    "error": f"API error: {create_response.status_code} - {create_response.text}"
                })
                print(f"✗ Error creating post for {file_data['filename']}: {create_response.text}")

        except Exception as e:
            errors.append({
                "file": file_data["filename"],
                "error": str(e)
            })
            print(f"✗ Exception for {file_data['filename']}: {str(e)}")

    return {"createdPosts": created_posts, "errors": errors}

def main():
    print("=== Media & Post Management Script ===")
    print(f"Starting at: {json.dumps({'timestamp': 'now'})}")

    try:
        # Step 1: Delete duplicate media files
        delete_duplicate_media()

        # Step 2: Create posts
        result = create_markdown_posts()
        created_posts = result["createdPosts"]
        errors = result["errors"]

        # Summary
        print("\n=== Summary ===")
        print(f"Total posts created: {len(created_posts)}")
        print(f"Total errors: {len(errors)}")

        if errors:
            print("\nErrors:")
            for err in errors:
                print(f"  - {err['file']}: {err['error']}")

        if created_posts:
            print("\nCreated posts:")
            for post in created_posts:
                print(f"  - {post['title']} ({post['slug']})")

        print("\n✓ Script completed successfully")

    except Exception as e:
        print(f"\n✗ Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
