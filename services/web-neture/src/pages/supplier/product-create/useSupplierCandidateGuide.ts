import { useState, useEffect } from 'react';
import { fetchGuidePageContent } from '../../../api/guideContent';
const GUIDE_PAGE_KEY = 'supplier.product.editor';
const SERVICE_KEY = 'neture';

export function useSupplierCandidateGuide() {
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

  return {
    guideTitle,
    guideDesc,
    guideSteps,
  };
}
