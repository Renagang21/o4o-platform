/**
 * RoutineListPage - Consumer Routine List Page Skeleton
 *
 * Purpose: Display list of influencer/partner routines
 * Browse published routines
 *
 * @skeleton No design/styling - layout structure only
 */

// TODO: GET /api/v1/cosmetics/routines

export default function RoutineListPage() {
  return (
    <div>
      <h1>Routine List</h1>
      <p>Browse skincare routines created by influencers and partners</p>

      <section>
        <h2>Routine Filters</h2>
        <p>Skin Type / Concerns / Tags</p>
        {/* TODO: Filter components will be placed here */}
        {/* - SkinTypeFilter */}
        {/* - ConcernsFilter */}
        {/* - TagsFilter */}
        {/* - TimeOfUseFilter (morning/evening) */}
      </section>

      <section>
        <h2>Routine Cards</h2>
        <p>Routine summary cards will appear here</p>
        {/* TODO: Routine card list component will be placed here */}
        {/* - RoutineCard (title, description, skinType, viewCount) */}
        {/* - Pagination */}
      </section>
    </div>
  );
}
