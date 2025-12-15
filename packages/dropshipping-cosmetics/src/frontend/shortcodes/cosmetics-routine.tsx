/**
 * Cosmetics Routine Shortcode
 *
 * Shortcode: [cosmetics-routine partner_id="xxx"]
 *
 * Displays partner beauty routines.
 * Uses cosmetics-partner-extension API (Phase 7-Y).
 */

import React, { useState, useEffect } from 'react';

/**
 * Display-friendly routine interface
 * Mapped from PartnerRoutine API response
 */
interface DisplayRoutine {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  skinType: string[];
  concerns: string[];
  timeOfUse: string;
  routine: Array<{
    step: number;
    category: string;
    product: any;
    description: string;
    orderInRoutine: number;
  }>;
  viewCount: number;
  recommendCount: number;
}

/**
 * PartnerRoutine API response structure
 */
interface PartnerRoutineResponse {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  routineType: string;
  skinTypes?: string[];
  skinConcerns?: string[];
  steps: Array<{
    order: number;
    productId: string;
    description: string;
  }>;
  viewCount: number;
  likeCount: number;
}

export interface CosmeticsRoutineProps {
  partnerId?: string;
  routineId?: string;
  skinType?: string[];
  concerns?: string[];
}

export const CosmeticsRoutine: React.FC<CosmeticsRoutineProps> = ({
  partnerId,
  routineId,
  skinType,
  concerns,
}) => {
  const [routines, setRoutines] = useState<DisplayRoutine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutines();
  }, [partnerId, routineId, skinType, concerns]);

  /**
   * Map PartnerRoutine API response to display format
   */
  const mapToDisplayRoutine = (routine: PartnerRoutineResponse): DisplayRoutine => ({
    id: routine.id,
    partnerId: routine.partnerId,
    title: routine.title,
    description: routine.description,
    skinType: routine.skinTypes || [],
    concerns: routine.skinConcerns || [],
    timeOfUse: routine.routineType || 'morning',
    routine: (routine.steps || []).map((step, index) => ({
      step: index + 1,
      category: step.description || 'Unknown',
      product: { id: step.productId },
      description: step.description || '',
      orderInRoutine: step.order,
    })),
    viewCount: routine.viewCount || 0,
    recommendCount: routine.likeCount || 0,
  });

  const fetchRoutines = async () => {
    setLoading(true);

    try {
      // Use cosmetics-partner-extension API (Phase 7-Y)
      let url = '/api/v1/partner/routine';

      if (routineId) {
        // Fetch single routine
        url += `/${routineId}`;
      } else if (partnerId) {
        // Fetch by partner
        url += `/partner/${partnerId}`;
      } else {
        // Fetch public routines
        url += '/public/all';
      }

      // Build query params for filtering
      const params = new URLSearchParams();
      if (skinType) skinType.forEach((t) => params.append('skinType', t));
      if (concerns) concerns.forEach((c) => params.append('concerns', c));

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json() as { data?: PartnerRoutineResponse | PartnerRoutineResponse[] };

      if (routineId) {
        const single = data.data as PartnerRoutineResponse;
        setRoutines(single ? [mapToDisplayRoutine(single)] : []);
      } else {
        const list = (data.data as PartnerRoutineResponse[]) || [];
        setRoutines(list.map(mapToDisplayRoutine));
      }
    } catch (error) {
      console.error('Error fetching routines:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading routines...</div>;
  }

  return (
    <div className="cosmetics-routine">
      {routines.map((routine) => (
        <div key={routine.id} className="routine-card" style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <h2>{routine.title}</h2>
          {routine.description && <p>{routine.description}</p>}

          <div className="routine-meta">
            <span>Skin Type: {routine.skinType.join(', ')}</span>
            <span>Concerns: {routine.concerns.join(', ')}</span>
            <span>Time: {routine.timeOfUse}</span>
          </div>

          <div className="routine-steps">
            <h3>Steps</h3>
            {routine.routine.map((step, index) => (
              <div key={index} className="step">
                <strong>Step {step.orderInRoutine}:</strong> {step.category}
                {step.description && <p>{step.description}</p>}
              </div>
            ))}
          </div>

          <div className="routine-stats">
            <span>Views: {routine.viewCount}</span>
            <span>Recommends: {routine.recommendCount}</span>
          </div>
        </div>
      ))}

      {!loading && routines.length === 0 && <div>No routines found.</div>}
    </div>
  );
};

export default CosmeticsRoutine;
