import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { SERVICE_LOGOS } from '../utils/streaming-services';

interface StreamingBadgesProps {
  itemId: number;
  itemType: 'movie' | 'tv';
  userServices?: number[];
}

export function StreamingBadges({ itemId, itemType, userServices = [] }: StreamingBadgesProps) {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, [itemId, itemType]);

  const loadProviders = async () => {
    try {
      const data = await apiCall(`/tmdb/details/${itemType}/${itemId}`);
      const usProviders = data['watch/providers']?.results?.US?.flatrate || [];
      setProviders(usProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || providers.length === 0) {
    return null;
  }

  // Filter to only show services the user has
  const relevantProviders = userServices.length > 0
    ? providers.filter(p => userServices.includes(p.provider_id))
    : providers.slice(0, 3); // Show max 3 if no user services selected

  if (relevantProviders.length === 0 && userServices.length > 0) {
    return (
      <div className="text-xs text-gray-500 mt-2">
        Not on your services
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {relevantProviders.map((provider) => (
        <div
          key={provider.provider_id}
          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
        >
          {SERVICE_LOGOS[provider.provider_id] || provider.provider_name}
        </div>
      ))}
    </div>
  );
}
