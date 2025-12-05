/**
 * Cosmetics Routine Shortcode
 *
 * Shortcode: [cosmetics-routine partner_id="xxx"]
 *
 * Displays influencer beauty routines
 */

import React, { useState, useEffect } from 'react';
import type { InfluencerRoutine } from '../../types.js';

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
  const [routines, setRoutines] = useState<InfluencerRoutine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutines();
  }, [partnerId, routineId, skinType, concerns]);

  const fetchRoutines = async () => {
    setLoading(true);

    try {
      let url = '/api/v1/partner/routines';

      // Build query params
      const params = new URLSearchParams();
      if (partnerId) params.append('partnerId', partnerId);
      if (skinType) skinType.forEach((t) => params.append('skinType', t));
      if (concerns) concerns.forEach((c) => params.append('concerns', c));

      if (routineId) {
        url += `/${routineId}`;
      } else if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json() as { data?: InfluencerRoutine | InfluencerRoutine[] };

      if (routineId) {
        setRoutines(data.data ? [data.data as InfluencerRoutine] : []);
      } else {
        setRoutines((data.data as InfluencerRoutine[]) || []);
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
