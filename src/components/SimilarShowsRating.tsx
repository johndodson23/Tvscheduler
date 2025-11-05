import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ThumbsUp, ThumbsDown, Sparkles, X, Check, Loader2, Film, Tv } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface SimilarShowsRatingProps {
  show: any; // The show that was just added
  showType: 'tv' | 'movie';
  onClose: () => void;
  onComplete: () => void;
}

interface RatingOption {
  id: number;
  type: 'tv' | 'movie';
  title: string;
  poster: string | null;
  releaseYear?: string;
  genres?: any[];
  rating: number | null; // 1-10 scale, null = haven't seen
  ratingType: 'thumbs_down' | 'thumbs_up' | 'two_thumbs_up' | null;
  hasWatched: boolean | null; // null = not answered yet
}

export function SimilarShowsRating({ show, showType, onClose, onComplete }: SimilarShowsRatingProps) {
  const [similarItems, setSimilarItems] = useState<RatingOption[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRatings, setUserRatings] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadSimilarContent();
  }, []);

  const loadSimilarContent = async () => {
    try {
      // Get similar shows/movies and recommendations
      const [similarData, recommendationsData] = await Promise.all([
        apiCall(`/tmdb/similar/${showType}/${show.id}`),
        apiCall(`/tmdb/recommendations/${showType}/${show.id}`)
      ]);

      // Combine and deduplicate
      const combined = [...(similarData.results || []), ...(recommendationsData.results || [])]
        .filter((item: any, index: number, self: any[]) => 
          index === self.findIndex(t => t.id === item.id)
        )
        .slice(0, 10); // Limit to 10 items

      // Get detailed info for each
      const detailedItems = await Promise.all(
        combined.slice(0, 6).map(async (item: any) => {
          try {
            const details = await apiCall(`/tmdb/details/${showType}/${item.id}`);
            return {
              id: item.id,
              type: showType,
              title: item.title || item.name,
              poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
              releaseYear: (item.release_date || item.first_air_date || '').substring(0, 4),
              genres: details.genres?.slice(0, 3) || [],
              rating: null,
              ratingType: null,
              hasWatched: null
            };
          } catch (err) {
            return null;
          }
        })
      );

      setSimilarItems(detailedItems.filter(Boolean) as RatingOption[]);
    } catch (error) {
      console.error('Error loading similar content:', error);
      toast.error('Failed to load recommendations');
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleWatchedResponse = (hasWatched: boolean) => {
    const updatedItems = [...similarItems];
    updatedItems[currentIndex].hasWatched = hasWatched;
    
    if (!hasWatched) {
      // If not watched, default to want_to_watch and move to next
      updatedItems[currentIndex].rating = 0;
      updatedItems[currentIndex].ratingType = null;
      setSimilarItems(updatedItems);
      moveToNext();
    } else {
      // If watched, show rating interface with thumbs up as default
      updatedItems[currentIndex].ratingType = 'thumbs_up';
      updatedItems[currentIndex].rating = 6; // For backward compatibility
      setSimilarItems(updatedItems);
    }
  };

  const handleRatingTypeChange = (ratingType: 'thumbs_down' | 'thumbs_up' | 'two_thumbs_up') => {
    const updatedItems = [...similarItems];
    updatedItems[currentIndex].ratingType = ratingType;
    // Set numeric rating for backward compatibility
    const ratingMap = { thumbs_down: 3, thumbs_up: 7, two_thumbs_up: 9 };
    updatedItems[currentIndex].rating = ratingMap[ratingType];
    setSimilarItems(updatedItems);
  };

  const moveToNext = () => {
    if (currentIndex < similarItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all items
      saveRatings();
    }
  };

  const saveRatings = async () => {
    setSaving(true);
    try {
      // Save all ratings to backend
      const ratingsToSave = similarItems.filter(item => item.rating !== null);
      
      await Promise.all(
        ratingsToSave.map(item => 
          apiCall('/rate', {
            method: 'POST',
            body: JSON.stringify({
              itemId: item.id,
              itemType: item.type,
              rating: item.rating,
              ratingType: item.ratingType || 'thumbs_up',
              watchedStatus: item.hasWatched ? 'watched' : 'want_to_watch',
              item: {
                id: item.id,
                type: item.type,
                title: item.title,
                poster: item.poster
              }
            })
          })
        )
      );

      toast.success(`Saved ${ratingsToSave.length} ratings to improve your recommendations!`);
      onComplete();
    } catch (error) {
      console.error('Error saving ratings:', error);
      toast.error('Failed to save some ratings');
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    saveRatings();
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="sr-only">
            <DialogTitle>Loading similar shows</DialogTitle>
            <DialogDescription>Finding shows you might like</DialogDescription>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (similarItems.length === 0) {
    // No similar items found, close immediately
    onComplete();
    return null;
  }

  const currentItem = similarItems[currentIndex];
  const progress = ((currentIndex + 1) / similarItems.length) * 100;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Help Us Personalize Your Recommendations
              </DialogTitle>
              <DialogDescription>
                Have you seen any of these similar shows? Your ratings help us recommend better content.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{currentIndex + 1} of {similarItems.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="p-6 pt-2">
            {/* Current Item Card */}
            <Card className="overflow-hidden mb-6">
              <div className="flex flex-col sm:flex-row gap-4 p-6">
                {/* Poster */}
                <div className="flex-shrink-0">
                  {currentItem.poster ? (
                    <img
                      src={currentItem.poster}
                      alt={currentItem.title}
                      className="w-32 h-48 object-cover rounded-lg shadow-lg mx-auto sm:mx-0"
                    />
                  ) : (
                    <div className="w-32 h-48 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                      {currentItem.type === 'tv' ? (
                        <Tv className="w-12 h-12 text-purple-400" />
                      ) : (
                        <Film className="w-12 h-12 text-purple-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-xl mb-2">{currentItem.title}</h3>
                  
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {currentItem.releaseYear && (
                      <Badge variant="secondary">{currentItem.releaseYear}</Badge>
                    )}
                    {currentItem.genres.map((genre: any) => (
                      <Badge key={genre.id} variant="outline">{genre.name}</Badge>
                    ))}
                  </div>

                  {/* Rating Question */}
                  {currentItem.hasWatched === null && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-3">Have you seen this?</p>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleWatchedResponse(true)}
                          className="flex-1"
                          variant="outline"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Yes, I've seen it
                        </Button>
                        <Button
                          onClick={() => handleWatchedResponse(false)}
                          className="flex-1"
                          variant="outline"
                        >
                          <X className="w-4 h-4 mr-2" />
                          No, it's new to me
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rating Interface */}
                  {currentItem.hasWatched === true && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-3">How would you rate it?</p>
                        
                        {/* Netflix-style rating buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant={currentItem.ratingType === 'thumbs_down' ? 'default' : 'outline'}
                            className="flex-col h-auto py-3"
                            onClick={() => handleRatingTypeChange('thumbs_down')}
                          >
                            <ThumbsDown className="w-5 h-5 mb-1" />
                            <span className="text-xs">Not for me</span>
                          </Button>
                          <Button
                            variant={currentItem.ratingType === 'thumbs_up' ? 'default' : 'outline'}
                            className="flex-col h-auto py-3"
                            onClick={() => handleRatingTypeChange('thumbs_up')}
                          >
                            <ThumbsUp className="w-5 h-5 mb-1" />
                            <span className="text-xs">I like this</span>
                          </Button>
                          <Button
                            variant={currentItem.ratingType === 'two_thumbs_up' ? 'default' : 'outline'}
                            className="flex-col h-auto py-3"
                            onClick={() => handleRatingTypeChange('two_thumbs_up')}
                          >
                            <div className="flex gap-0.5 mb-1">
                              <ThumbsUp className="w-4 h-4" />
                              <ThumbsUp className="w-4 h-4" />
                            </div>
                            <span className="text-xs">Love this!</span>
                          </Button>
                        </div>
                      </div>

                      <Button
                        onClick={moveToNext}
                        className="w-full"
                        size="lg"
                      >
                        {currentIndex < similarItems.length - 1 ? 'Next' : 'Finish'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Preview of remaining items */}
            {currentIndex < similarItems.length - 1 && (
              <div>
                <p className="text-sm text-gray-500 mb-3">Coming up:</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {similarItems.slice(currentIndex + 1, currentIndex + 4).map((item) => (
                    <div key={item.id} className="flex-shrink-0">
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-16 h-24 object-cover rounded shadow-sm opacity-60"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center opacity-60">
                          {item.type === 'tv' ? (
                            <Tv className="w-6 h-6 text-gray-400" />
                          ) : (
                            <Film className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
