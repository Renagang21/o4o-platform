import { useEffect } from 'react';
import { useEventOfferLists } from './useEventOfferLists';
import { useEventProposal } from './useEventProposal';

/** Keep the initial effect order: guide, product binding, list, proposal status. */
export function useSupplierEventOffers() {
  const lists = useEventOfferLists();
  const proposal = useEventProposal(lists);
  const { activeTab, fetchItems, loadMyProposals } = lists;
  useEffect(() => {
    fetchItems(1, activeTab);
  }, [activeTab, fetchItems]);
  useEffect(() => {
    loadMyProposals();
  }, [loadMyProposals]);
  return { ...lists, ...proposal };
}
