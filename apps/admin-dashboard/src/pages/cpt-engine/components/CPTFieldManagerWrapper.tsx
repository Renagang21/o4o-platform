/**
 * CPTFieldManager Wrapper - Fetches data and provides it to CPTFieldManager
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import CPTFieldManager from './CPTFieldManager';
import { Loader2 } from 'lucide-react';

const CPTFieldManagerWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | undefined>();

  // Fetch CPT types
  const { data: cptTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await cptApi.getTypes();
      return response || [];
    }
  });

  if (typesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <CPTFieldManager
      cptTypes={cptTypes}
      selectedType={selectedType}
      onTypeSelect={setSelectedType}
    />
  );
};

export default CPTFieldManagerWrapper;