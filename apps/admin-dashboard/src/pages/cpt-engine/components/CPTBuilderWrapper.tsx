/**
 * CPTBuilder Wrapper - Fetches data and provides it to CPTBuilder
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import CPTBuilder from './CPTBuilder';
import { Loader2 } from 'lucide-react';

const CPTBuilderWrapper = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Fetch CPT types
  const { data: cptTypes = [], isLoading } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await cptApi.getTypes();
      return response || [];
    }
  });

  // Find selected type if editing
  const selectedType = slug ? cptTypes.find(t => t.slug === slug) : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <CPTBuilder
      cptTypes={cptTypes}
      selectedType={selectedType}
      onUpdate={() => navigate('/cpt-engine')}
      onClose={() => navigate('/cpt-engine')}
    />
  );
};

export default CPTBuilderWrapper;