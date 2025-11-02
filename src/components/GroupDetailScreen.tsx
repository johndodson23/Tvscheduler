import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ChevronLeft, Heart, X, Sparkles } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { ShowDetailModal } from './ShowDetailModal';
import { toast } from 'sonner@2.0.3';
import { motion, AnimatePresence } from 'motion/react';

interface GroupDetailScreenProps {
  group: any;
  onBack: () => void;
}

export function GroupDetailScreen({ group, onBack }: GroupDetailScreenProps) {
  const [view, setView] = useState<'queue' | 'swipe' | 'matches'>('queue');
  const [queue, setQueue] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [detailItem, setDetailItem] = useState<any>(null);

  useEffect(() => {
    loadGroupQueue();
    loadMatches();
    // Auto-populate with trending if queue is empty
    loadTrendingIfNeeded();
  }, [group.id]);

  const loadTrendingIfNeeded = async () => {
    try {
      const data = await apiCall(`/groups/${group.id}/queue`);
      if (data.queue.length === 0) {
        // Add some trending items to get started
        const trending = await apiCall('/tmdb/trending?type=all');
        const filtered = trending.results
          .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 10);
        
        for (const item of filtered) {
          try {
            await apiCall(`/groups/${group.id}/queue`, {
              method: 'POST',
              body: JSON.stringify({
                id: item.id,
                type: item.media_type,
                title: item.title || item.name,
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
                backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : null,
                overview: item.overview,
                releaseDate: item.release_date || item.first_air_date,
              }),
            });
          } catch (err) {
            console.error('Error adding trending item:', err);
          }
        }
        loadGroupQueue();
      }
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  const loadGroupQueue = async () => {
    try {
      const data = await apiCall(`/groups/${group.id}/queue`);
      setQueue(data.queue);
    } catch (error) {
      console.error('Error loading group queue:', error);
    }
  };

  const loadMatches = async () => {
    try {
      const data = await apiCall(`/groups/${group.id}/matches`);
      setMatches(data.matches);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const handleAddToGroupQueue = async (item: any) => {
    try {
      await apiCall(`/groups/${group.id}/queue`, {
        method: 'POST',
        body: JSON.stringify(item),
      });
      toast.success('Added to group queue!');
      loadGroupQueue();
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error adding to group queue:', error);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= queue.length) return;

    const item = queue[currentIndex];
    setSwipeDirection(direction);

    try {
      const data = await apiCall(`/groups/${group.id}/swipe`, {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.id,
          itemType: item.type,
          direction,
        }),
      });

      if (data.match) {
        toast.success("It's a match! 🎉");
        loadMatches();
      }

      // Wait for animation to complete
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setSwipeDirection(null);
      }, 300);
    } catch (error) {
      console.error('Error recording swipe:', error);
      setSwipeDirection(null);
    }
  };

  const currentItem = queue[currentIndex];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl">{group.name}</h1>
            <p className="text-sm text-gray-500">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={view === 'queue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('queue')}
            className="flex-1"
          >
            Queue ({queue.length})
          </Button>
          <Button
            variant={view === 'swipe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('swipe')}
            className="flex-1"
          >
            Swipe
          </Button>
          <Button
            variant={view === 'matches' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('matches')}
            className="flex-1"
          >
            Matches ({matches.length})
          </Button>
        </div>
      </div>

      {view === 'queue' && (
        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white border-b border-gray-200">
            <SearchBar onSelect={setDetailItem} placeholder="Add to group queue..." />
          </div>
          <ScrollArea className="flex-1">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Group queue is empty</p>
                <p className="text-sm mt-2">Add shows above to start swiping</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 bg-white">
                {queue.map((item, index) => (
                  <div key={`${item.type}-${item.id}`} className="p-4 flex gap-3">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-gray-200 rounded" />
                    )}
                    <div className="flex-1">
                      <div className="mb-1">{item.title}</div>
                      <div className="text-sm text-gray-500">
                        {item.type === 'movie' ? 'Movie' : 'TV Show'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {view === 'swipe' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {!currentItem || currentIndex >= queue.length ? (
            <div className="text-center text-gray-500">
              <p>No more items to swipe</p>
              <p className="text-sm mt-2">Add more shows to the queue</p>
            </div>
          ) : (
            <div className="w-full max-w-sm">
              <div className="relative mb-6">
                <AnimatePresence>
                  {currentItem && (
                    <motion.div
                      key={currentIndex}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
                        rotate: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                      className="bg-white rounded-xl shadow-xl overflow-hidden"
                    >
                      {currentItem.backdrop ? (
                        <img
                          src={currentItem.backdrop}
                          alt={currentItem.title}
                          className="w-full h-64 object-cover"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-purple-500 to-pink-500" />
                      )}
                      <div className="p-6">
                        <h2 className="text-xl mb-2">{currentItem.title}</h2>
                        <div className="text-sm text-gray-500 mb-3">
                          {currentItem.type === 'movie' ? 'Movie' : 'TV Show'} • {currentItem.releaseDate?.split('-')[0] || 'N/A'}
                        </div>
                        {currentItem.overview && (
                          <p className="text-sm text-gray-600 line-clamp-3">{currentItem.overview}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-center gap-6">
                <button
                  onClick={() => handleSwipe('left')}
                  disabled={!!swipeDirection}
                  className="w-16 h-16 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <X className="w-8 h-8" />
                </button>
                <button
                  onClick={() => handleSwipe('right')}
                  disabled={!!swipeDirection}
                  className="w-16 h-16 rounded-full bg-white border-2 border-green-500 text-green-500 flex items-center justify-center shadow-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  <Heart className="w-8 h-8" />
                </button>
              </div>

              <div className="text-center mt-6 text-sm text-gray-500">
                {currentIndex + 1} / {queue.length}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'matches' && (
        <ScrollArea className="flex-1">
          {matches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No matches yet</p>
              <p className="text-sm mt-2">Swipe on shows to find mutual matches</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white">
              {matches.map((match) => {
                // Find the full item details from queue
                const item = queue.find(q => q.id === match.id && q.type === match.type);
                if (!item) return null;

                return (
                  <div key={`${match.type}-${match.id}`} className="p-4 flex gap-3">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-20 h-30 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-30 bg-gray-200 rounded" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div>{item.title}</div>
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {item.type === 'movie' ? 'Movie' : 'TV Show'}
                      </div>
                      <div className="text-xs text-green-600">
                        Everyone wants to watch this!
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <ShowDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirmAdd={(itemToAdd) => {
            handleAddToGroupQueue(itemToAdd);
            setDetailItem(null);
          }}
          actionButtonText="Add to Group Queue"
        />
      )}
    </div>
  );
}
