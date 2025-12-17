/**
 * RoutineDetailPage - Consumer Routine Detail Page Skeleton
 *
 * Purpose: Display single routine details
 * Show routine steps and recommended products
 *
 * @skeleton No design/styling - layout structure only
 */

// TODO: GET /api/v1/cosmetics/routines/:id

export interface RoutineDetailPageProps {
  routineId?: string;
}

export default function RoutineDetailPage({ routineId }: RoutineDetailPageProps) {
  return (
    <div>
      <h1>Routine Detail</h1>
      <p>Viewing routine: {routineId || 'No ID provided'}</p>

      <section>
        <h2>Routine Summary</h2>
        <p>Title, description, skin type, concerns</p>
        {/* TODO: Routine summary component will be placed here */}
        {/* - RoutineTitle */}
        {/* - RoutineDescription */}
        {/* - SkinTypeBadges */}
        {/* - ConcernBadges */}
        {/* - TimeOfUseBadge */}
        {/* - ViewCount / RecommendCount */}
      </section>

      <section>
        <h2>Routine Steps</h2>
        <p>Step-by-step routine products</p>
        {/* TODO: Routine steps component will be placed here */}
        {/* - RoutineStep (step number, category, product, description) */}
        {/* - Each step shows linked product */}
      </section>

      <section>
        <h2>Recommended Products</h2>
        <p>Products related to this routine</p>
        {/* TODO: Related products component will be placed here */}
        {/* - CosmeticsProductCard list */}
      </section>

      <section>
        <h2>Actions</h2>
        <p>User actions for this routine</p>
        {/* TODO: Action buttons will be placed here */}
        {/* - RecommendButton (increment recommend count) */}
        {/* - ShareButton */}
        {/* - AddToCartButton (for all products) */}
      </section>
    </div>
  );
}
