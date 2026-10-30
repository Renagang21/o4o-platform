/** Typed ownership through the grant's existing parent; inviter attribution is not ownership.
 * Used before parents are removed/anonymized. Peer rows still undergo the identity scan.
 */
export const CENTRAL_MENU_GRANT_OWNER_SQL = `
  EXISTS (SELECT 1 FROM role_assignments owner
    WHERE owner.id=r.assignment_id AND owner.user_id::text=$1)
  OR EXISTS (SELECT 1 FROM service_operator_invitations owner
    WHERE owner.id=r.invitation_id AND (
      owner.target_user_id::text=$1 OR owner.accepted_user_id::text=$1
      OR (owner.target_user_id IS NULL AND lower(owner.invited_email)=
        (SELECT lower(email) FROM users WHERE id::text=$1))
    ))`;
