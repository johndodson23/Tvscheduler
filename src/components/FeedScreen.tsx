import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { Star, Plus } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

export function FeedScreen() {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const data = await apiCall('/feed');
      setFeed(data.feed);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityText = (activity: any) => {
    switch (activity.action) {
      case 'added':
        return 'added to queue';
      case 'rated':
        return `rated ${activity.item.rating} stars`;
      default:
        return activity.action;
    }
  };

  const getActivityIcon = (activity: any) => {
    switch (activity.action) {
      case 'added':
        return <Plus className="w-4 h-4" />;
      case 'rated':
        return <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl">Activity Feed</h1>
        <p className="text-sm text-gray-500 mt-1">See what you've been watching</p>
      </div>

      <ScrollArea className="flex-1 h-0 w-full">
        {feed.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No activity yet</p>
            <p className="text-sm mt-2">Add shows to your queue or rate them to see activity here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {feed.map((activity, index) => (
              <div key={index} className="p-4 flex gap-3">
                <div className="flex-shrink-0">
                  {activity.item.poster ? (
                    <img
                      src={activity.item.poster}
                      alt={activity.item.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-gray-200 rounded" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-600">{activity.userName || 'You'}</span>
                    {getActivityIcon(activity)}
                    <span className="text-gray-600">{getActivityText(activity)}</span>
                  </div>
                  <div className="text-sm">{activity.item.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
