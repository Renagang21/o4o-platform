/**
 * 공급자 허브 페이지
 *
 * - RoleGuard로 supplier 역할만 접근 가능
 * - HubLayout 사용하여 역할별 UI 표시
 * - M4: PersonalizedFeed 통합
 */

import React, { useState, useEffect } from 'react';
import { HubLayout } from '../../components/layout/HubLayout';
import { useAuth } from '../../contexts/AuthContext';
import { generatePersonalizedFeed } from '../../services/personalizationService';
import { PersonalizedFeed } from '../../components/personalization/PersonalizedFeed';

export const SupplierHub: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.currentRole || user?.roles?.[0] || 'supplier';
  const [feed, setFeed] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const personalizedFeed = generatePersonalizedFeed(
        currentRole,
        user.roles || [currentRole],
        user.createdAt
      );
      setFeed(personalizedFeed);
      setIsLoading(false);
    }
  }, [user, currentRole]);

  return (
    <HubLayout requiredRole="supplier">
      {feed && (
        <PersonalizedFeed
          cards={feed.mainCards}
          role={currentRole}
          isLoading={isLoading}
        />
      )}
    </HubLayout>
  );
};

export default SupplierHub;
