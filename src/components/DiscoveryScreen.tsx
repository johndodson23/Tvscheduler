import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Heart, X, Sparkles, Film, Tv, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

export function DiscoveryScreen() {
  const [trending, setTrending] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<any[]>([]);
  const [view, setView] = useState<'swipe' | 'liked'>('swipe');
  const [userRatings, setUserRatings] = useState<any[]>([]);
  const [personalizedQueue, setPersonalizedQueue] = useState<any[]>([]);

  useEffect(() => {
    loadUserPreferences();
    // Load liked items from localStorage
    const savedLiked = localStorage.getItem('likedItems');
    if (savedLiked) {
      setLiked(JSON.parse(savedLiked));
    }
  }, []);

  const loadUserPreferences = async () => {
    try {
      // Get user ratings to personalize recommendations
      const ratingsData = await apiCall('/ratings');
      setUserRatings(ratingsData.ratings || []);
      
      // Load personalized recommendations
      await loadPersonalizedRecommendations(ratingsData.ratings || []);
    } catch (error) {
      console.error('Error loading user preferences:', error);
      // Fallback to trending
      loadTrending();
    }
  };

  const loadPersonalizedRecommendations = async (ratings: any[]) => {
    try {
      // If user has ratings, use them to get better recommendations
      if (ratings.length >= 3) {
        // Get highly rated items (7+)
        const highlyRated = ratings
          .filter((r: any) => r.rating >= 7)
          .sort((a: any, b: any) => b.rating - a.rating)
          .slice(0, 5);

        if (highlyRated.length > 0) {
          // Get recommendations based on highly rated items
          const recommendationPromises = highlyRated.map(async (rated: any) => {
            try {
              const [similarData, recsData] = await Promise.all([
                apiCall(`/tmdb/similar/${rated.itemType}/${rated.itemId}`),
                apiCall(`/tmdb/recommendations/${rated.itemType}/${rated.itemId}`)
              ]);
              return [...(similarData.results || []), ...(recsData.results || [])];
            } catch (err) {
              return [];
            }
          });

          const allRecs = await Promise.all(recommendationPromises);
          const combined = allRecs.flat();
          
          // Deduplicate and filter
          const seen = new Set();
          const unique = combined.filter((item: any) => {
            if (seen.has(item.id) || !item.id) return false;
            seen.add(item.id);
            return item.media_type === 'movie' || item.media_type === 'tv';
          });

          // Mix in some trending content
          const trendingData = await apiCall('/tmdb/trending?type=all');
          const trendingFiltered = trendingData.results.filter((item: any) => 
            (item.media_type === 'movie' || item.media_type === 'tv') && !seen.has(item.id)
          );

          // Combine personalized (70%) with trending (30%)
          const personalized = [...unique.slice(0, 20), ...trendingFiltered.slice(0, 10)];
          
          // Shuffle to mix them
          const shuffled = personalized.sort(() => Math.random() - 0.5);
          setTrending(shuffled);
          setLoading(false);
          
          // Show toast to let user know we're personalizing
          toast.success('Recommendations personalized based on your ratings!', {
            duration: 3000,
          });
          return;
        }
      }
      
      // Fallback to just trending if not enough ratings
      loadTrending();
    } catch (error) {
      console.error('Error loading personalized recommendations:', error);
      loadTrending();
    }
  };

  const loadTrending = async () => {
    try {
      const data = await apiCall('/tmdb/trending?type=all');
      const filtered = data.results.filter((item: any) => 
        item.media_type === 'movie' || item.media_type === 'tv'
      );
      setTrending(filtered);
    } catch (error) {
      console.error('Error loading trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= trending.length) return;

    const item = trending[currentIndex];
    setSwipeDirection(direction);

    if (direction === 'right') {
      const likedItem = {
        id: item.id,
        type: item.media_type,
        title: item.title || item.name,
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
        backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : null,
      };
      const newLiked = [...liked, likedItem];
      setLiked(newLiked);
      localStorage.setItem('likedItems', JSON.stringify(newLiked));
      
      // Add to personal queue and save implicit rating
      try {
        await Promise.all([
          apiCall('/queue', {
            method: 'POST',
            body: JSON.stringify({
              ...likedItem,
              overview: item.overview,
              releaseDate: item.release_date || item.first_air_date,
            }),
          }),
          // Save implicit positive rating (7/10 for a right swipe)
          apiCall('/rate', {
            method: 'POST',
            body: JSON.stringify({
              itemId: item.id,
              itemType: item.media_type,
              rating: 7,
              item: likedItem
            })
          })
        ]);
      } catch (error) {
        console.error('Error adding to queue:', error);
      }
    } else if (direction === 'left') {
      // Save implicit negative rating (3/10 for a left swipe)
      try {
        await apiCall('/rate', {
          method: 'POST',
          body: JSON.stringify({
            itemId: item.id,
            itemType: item.media_type,
            rating: 3,
            item: {
              id: item.id,
              type: item.media_type,
              title: item.title || item.name,
              poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
            }
          })
        });
      } catch (error) {
        console.error('Error saving dislike:', error);
      }
    }

    // Wait for animation to complete
    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
      setSwipeDirection(null);
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading recommendations...</div>
      </div>
    );
  }

  const currentItem = trending[currentIndex];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl">Discovery</h1>
            <p className="text-sm text-gray-500 mt-1">
              {userRatings.length >= 3 ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Personalized for you
                </span>
              ) : (
                'Swipe to find your next watch'
              )}
            </p>
          </div>
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            variant={view === 'swipe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('swipe')}
            className="flex-1"
          >
            Discover
          </Button>
          <Button
            variant={view === 'liked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('liked')}
            className="flex-1"
          >
            Liked ({liked.length})
          </Button>
        </div>
      </div>

      {view === 'swipe' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {!currentItem || currentIndex >= trending.length ? (
            <div className="text-center text-gray-500">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">All done!</p>
              <p className="text-sm mt-2 mb-4">You've seen all current recommendations</p>
              <Button 
                onClick={() => { 
                  setCurrentIndex(0); 
                  setLoading(true);
                  loadUserPreferences(); 
                }} 
                className="mt-4"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Load More'}
              </Button>
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
                      {currentItem.backdrop_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${currentItem.backdrop_path}`}
                          alt={currentItem.title || currentItem.name}
                          className="w-full h-64 object-cover"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          {currentItem.media_type === 'movie' ? (
                            <Film className="w-16 h-16 text-white opacity-50" />
                          ) : (
                            <Tv className="w-16 h-16 text-white opacity-50" />
                          )}
                        </div>
                      )}
                      <div className="p-6">
                        <h2 className="text-xl mb-2">{currentItem.title || currentItem.name}</h2>
                        <div className="text-sm text-gray-500 mb-3">
                          {currentItem.media_type === 'movie' ? 'Movie' : 'TV Show'} • {currentItem.release_date?.split('-')[0] || currentItem.first_air_date?.split('-')[0] || 'N/A'}
                        </div>
                        {currentItem.overview && (
                          <p className="text-sm text-gray-600 line-clamp-3">{currentItem.overview}</p>
                        )}
                        {currentItem.vote_average > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="text-sm">⭐ {currentItem.vote_average.toFixed(1)}/10</div>
                          </div>
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
                {currentIndex + 1} / {trending.length}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'liked' && (
        <ScrollArea className="flex-1 h-0 w-full">
          {liked.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No liked items yet</p>
              <p className="text-sm mt-2">Swipe right on shows to add them here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white">
              {liked.map((item, index) => (
                <div key={`${item.type}-${item.id}-${index}`} className="p-4 flex gap-3">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                      {item.type === 'movie' ? (
                        <Film className="w-8 h-8 text-gray-400" />
                      ) : (
                        <Tv className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
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
      )}
    </div>
  );
}
