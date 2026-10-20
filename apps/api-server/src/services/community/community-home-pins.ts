/** A board owner's pin is not a service-home editorial designation. Reserved CMS rows
 * are writable only by the live community manager API and carry no public-read grant. */
export const COMMUNITY_HOME_PIN_SQL = `EXISTS(SELECT 1 FROM cms_contents h
  WHERE h."serviceKey"='community' AND h."organizationId" IS NULL
    AND h.metadata->>'section'='community-editorial' AND h.metadata->>'kind'='forum-pin'
    AND h.status='published' AND h.metadata->>'postId'=p.id::text)`;
