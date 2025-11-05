import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ChevronLeft, ThumbsDown, ThumbsUp, Sparkles, Tv, Film as FilmIcon, Eye, Clock } from 'lucide-react';
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
  const [swipeDirection, setSwipeDirection] = useState<'thumbs_down' | 'thumbs_up' | 'two_thumbs_up' | null>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [watchedStatus, setWatchedStatus] = useState<'watched' | 'not_seen' | 'want_to_watch'>('not_seen');

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

  const handleSwipe = async (ratingType: 'thumbs_down' | 'thumbs_up' | 'two_thumbs_up') => {
    if (currentIndex >= queue.length) return;

    const item = queue[currentIndex];
    setSwipeDirection(ratingType);

    try {
      const data = await apiCall(`/groups/${group.id}/swipe`, {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.id,
          itemType: item.type,
          ratingType,
          watchedStatus,
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
        setWatchedStatus('not_seen'); // Reset to default
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
          <ScrollArea className="flex-1 h-0 w-full">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Group queue is empty</p>
                <p className="text-sm mt-2">Add shows above to start swiping</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {queue.map((item, index) => (
                  <Card 
                    key={`${item.type}-${item.id}`} 
                    className="p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setDetailItem(item)}
                  >
                    <div className="flex gap-3">
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-16 h-24 object-cover rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                          {item.type === 'movie' ? (
                            <FilmIcon className="w-8 h-8 text-purple-400" />
                          ) : (
                            <Tv className="w-8 h-8 text-purple-400" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="mb-1">{item.title}</div>
                        <div className="text-sm text-gray-500">
                          {item.type === 'movie' ? 'Movie' : 'TV Show'}
                        </div>
                      </div>
                    </div>
                  </Card>
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
                        x: swipeDirection === 'thumbs_down' ? -300 : (swipeDirection === 'thumbs_up' || swipeDirection === 'two_thumbs_up') ? 300 : 0,
                        rotate: swipeDirection === 'thumbs_down' ? -20 : (swipeDirection === 'thumbs_up' || swipeDirection === 'two_thumbs_up') ? 20 : 0,
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

              <div className="space-y-4">
                {/* Watched Status Toggle */}
                <div className="flex justify-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                  <button
                    onClick={() => setWatchedStatus('watched')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      watchedStatus === 'watched'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">Watched</span>
                  </button>
                  <button
                    onClick={() => setWatchedStatus('not_seen')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      watchedStatus === 'not_seen'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">Not Seen</span>
                  </button>
                  <button
                    onClick={() => setWatchedStatus('want_to_watch')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      watchedStatus === 'want_to_watch'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Want to Watch</span>
                  </button>
                </div>

                {/* Rating Buttons */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleSwipe('thumbs_down')}
                    disabled={!!swipeDirection}
                    className="w-16 h-16 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <ThumbsDown className="w-7 h-7" />
                  </button>
                  <button
                    onClick={() => handleSwipe('thumbs_up')}
                    disabled={!!swipeDirection}
                    className="w-16 h-16 rounded-full bg-white border-2 border-green-500 text-green-500 flex items-center justify-center shadow-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    <ThumbsUp className="w-7 h-7" />
                  </button>
                  <button
                    onClick={() => handleSwipe('two_thumbs_up')}
                    disabled={!!swipeDirection}
                    className="w-20 h-16 rounded-full bg-white border-2 border-purple-600 text-purple-600 flex items-center justify-center shadow-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex gap-0.5">
                      <ThumbsUp className="w-6 h-6" />
                      <ThumbsUp className="w-6 h-6" />
                    </div>
                  </button>
                </div>

                {/* Button Labels */}
                <div className="flex justify-center gap-4 text-xs text-gray-600">
                  <div className="w-16 text-center">Not for me</div>
                  <div className="w-16 text-center">I like this</div>
                  <div className="w-20 text-center">Love this!</div>
                </div>
              </div>

              <div className="text-center mt-6 text-sm text-gray-500">
                {currentIndex + 1} / {queue.length}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'matches' && (
        <ScrollArea className="flex-1 h-0 w-full">
          {matches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No matches yet</p>
              <p className="text-sm mt-2">Swipe on shows to find mutual matches</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {matches.map((match) => {
                // Find the full item details from queue
                const item = queue.find(q => q.id === match.id && q.type === match.type);
                if (!item) return null;

                return (
                  <Card 
                    key={`${match.type}-${match.id}`} 
                    className="p-4 shadow-md hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50/30"
                  >
                    <div className="flex gap-3">
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-20 h-30 object-cover rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-30 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                          {item.type === 'movie' ? (
                            <FilmIcon className="w-10 h-10 text-green-400" />
                          ) : (
                            <Tv className="w-10 h-10 text-green-400" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div>{item.title}</div>
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {item.type === 'movie' ? 'Movie' : 'TV Show'}
                        </div>
                        <div className="text-xs text-green-700 bg-green-100 inline-block px-2 py-1 rounded mb-2">
                          Everyone wants to watch this!
                        </div>
                        
                        {/* Show who has watched it */}
                        {match.userDetails && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="text-xs text-gray-600 mb-1">Watch Status:</div>
                            <div className="flex flex-wrap gap-2">
                              {group.memberDetails.map((member: any) => {
                                const userDetail = match.userDetails[member.id];
                                if (!userDetail) return null;
                                
                                const status = userDetail.watchedStatus;
                                const isHighRating = userDetail.ratingType === 'two_thumbs_up';
                                
                                const statusConfig = {
                                  watched: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Eye },
                                  not_seen: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Sparkles },
                                  want_to_watch: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock }
                                };
                                
                                const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_seen;
                                const Icon = config.icon;
                                
                                return (
                                  <div
                                    key={member.id}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}
                                  >
                                    <Icon className="w-3 h-3" />
                                    <span>{member.name}</span>
                                    {isHighRating && <span className="ml-0.5">💜</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
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
