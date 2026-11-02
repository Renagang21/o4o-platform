/** Legacy inquiry alerts predate operationMenu. Apply the current duty before returning private titles. */
export const centralNotificationMenu = `COALESCE(metadata->>'operationMenu',
  CASE WHEN type='contact.new' THEN
    CASE WHEN metadata->>'contactMessageId' IS NOT NULL THEN 'neture.legacy-contact'
         WHEN "serviceKey"='lecture' THEN 'lecture.contact'
         ELSE "serviceKey"||'.inbox' END
  END)`;
export const centralNotificationMenuPredicate = `(${centralNotificationMenu} IS NULL OR ${centralNotificationMenu}=ANY($3::text[]))`;
