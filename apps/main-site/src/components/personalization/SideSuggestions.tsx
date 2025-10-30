/**
 * 사이드 추천 컴포넌트
 */

import React from 'react';
import { Suggestion } from '../../types/personalization';
import { trackEvent } from '../../utils/analytics';
import { trackMenuClick } from '../../services/signalTracker';

interface SideSuggestionsProps {
  suggestions: Suggestion[];
  role: string;
}

export const SideSuggestions: React.FC<SideSuggestionsProps> = ({ suggestions, role }) => {
  const handleClick = (suggestion: Suggestion) => {
    trackEvent('suggestion_click', {
      role,
      suggestionId: suggestion.id,
      category: suggestion.category
    });
    trackMenuClick(suggestion.id);
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="side-suggestions bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">추천</h3>
      <ul className="space-y-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <a
              href={suggestion.url}
              onClick={() => handleClick(suggestion)}
              className="block p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-sm text-gray-900">{suggestion.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{suggestion.description}</div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SideSuggestions;
