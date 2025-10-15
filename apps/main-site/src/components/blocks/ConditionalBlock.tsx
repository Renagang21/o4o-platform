/**
 * Conditional Block - Frontend Renderer
 * 조건부로 콘텐츠를 표시/숨김
 */

import { FC, ReactNode, useMemo } from 'react';
import type { ConditionalBlockData, EvaluationContext } from '../../types/conditional-block.types';
import { evaluateConditions, createEvaluationContext } from '../../utils/evaluateConditions';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

interface ConditionalBlockProps {
  data?: ConditionalBlockData;
  children?: ReactNode;
  context?: Partial<EvaluationContext>;  // 외부에서 주입된 컨텍스트
}

/**
 * Conditional Block Component
 *
 * 조건을 평가하여 children을 표시하거나 숨김
 */
const ConditionalBlock: FC<ConditionalBlockProps> = ({
  data,
  children,
  context: externalContext,
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // 평가 컨텍스트 생성
  const evaluationContext = useMemo<EvaluationContext>(() => {
    // 외부 컨텍스트가 제공되면 사용
    if (externalContext) {
      return externalContext as EvaluationContext;
    }

    // 기본 컨텍스트 생성
    const searchParams = new URLSearchParams(location.search);
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    return createEvaluationContext({
      user: isAuthenticated ? user : null,
      url: {
        pathname: location.pathname,
        searchParams,
        hostname,
      },
    });
  }, [user, isAuthenticated, location, externalContext]);

  // 조건 평가
  const shouldShow = useMemo(() => {
    if (!data) {
      // 데이터가 없으면 항상 표시
      return true;
    }

    const {
      conditions = [],
      logicOperator = 'AND',
      showWhenMet = true,
    } = data;

    // 조건이 없으면 항상 표시
    if (conditions.length === 0) {
      return true;
    }

    // 조건 평가
    const conditionsMet = evaluateConditions(
      conditions,
      logicOperator,
      evaluationContext
    );

    // showWhenMet에 따라 표시 여부 결정
    return showWhenMet ? conditionsMet : !conditionsMet;
  }, [data, evaluationContext]);

  // 조건이 맞지 않으면 아무것도 렌더링하지 않음
  if (!shouldShow) {
    return null;
  }

  // 조건이 맞으면 children 렌더링
  return <>{children}</>;
};

export default ConditionalBlock;
