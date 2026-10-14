import { useState, useEffect, useCallback, useRef } from 'react';
import {
  netureEventOfferApi,
  supplierKpaEventOfferApi,
  type MyEventOfferProposal,
} from '../../../lib/api';
import { fetchGuidePageContent } from '../../../api/guideContent';
import {
  GUIDE_PAGE_KEY,
  SERVICE_KEY,
  type OfferItem,
  type StatusTab,
} from './presentation';

export function useEventOfferLists() {
  const itemsRequest = useRef(0);
  useEffect(() => () => {
    itemsRequest.current += 1;
  }, []);
  const [guideTitle, setGuideTitle] = useState<string | null>(null);

  const [guideDesc, setGuideDesc] = useState<string | null>(null);

  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
      .then((sections) => {
        if (cancelled) return;
        const raw = sections['guideblock-page-help'];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch {
          /* use fallback */
        }
      })
      .catch(() => {
        /* use fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<StatusTab>('active');

  const [items, setItems] = useState<OfferItem[]>([]);

  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);

  const [itemsError, setItemsError] = useState(false);

  const [myProposals, setMyProposals] = useState<MyEventOfferProposal[]>([]);

  const [proposalsLoading, setProposalsLoading] = useState(false);

  const [proposalsError, setProposalsError] = useState(false);

  const loadMyProposals = useCallback(async () => {
    setProposalsLoading(true);
    setProposalsError(false);
    try {
      const data = await supplierKpaEventOfferApi.listMyProposals();
      setMyProposals(data);
    } catch {
      // 조회 실패는 '제안 없음'이 아니다 — 오류 표시 후 재시도 가능.
      setMyProposals([]);
      setProposalsError(true);
    } finally {
      setProposalsLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async (p: number, status: StatusTab) => {
    const request = ++itemsRequest.current;
    // Retry must use this requested page even when the request fails.
    setPage(p);
    setLoading(true);
    setItemsError(false);
    try {
      const res = await netureEventOfferApi.getEnrichedOffers({
        page: p,
        limit: 20,
        status,
      });
      if (request !== itemsRequest.current) return;
      const body = res.data;
      setItems(body.data ?? []);
      setTotal(body.pagination?.total ?? 0);
      setTotalPages(body.pagination?.totalPages ?? 1);
    } catch {
      if (request !== itemsRequest.current) return;
      // 조회 실패는 '오퍼 0건'이 아니다 — 오류 표시 후 재시도 가능.
      setItems([]);
      setItemsError(true);
    } finally {
      if (request === itemsRequest.current) setLoading(false);
    }
  }, []);
  return {
    guideTitle,
    guideDesc,
    guideSteps,
    activeTab,
    setActiveTab,
    items,
    total,
    page,
    totalPages,
    loading,
    itemsError,
    myProposals,
    proposalsLoading,
    proposalsError,
    loadMyProposals,
    fetchItems,
  };
}
