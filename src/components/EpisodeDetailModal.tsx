import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { apiCall } from '../utils/api';
import { Bell, BellOff, Star, Check, Tv } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface EpisodeDetailModalProps {
  episode: any;
  showId: number;
  showName: string;
  showPoster?: string;
  onClose: () => void;
}

export function EpisodeDetailModal({ 
  episode, 
  showId, 
  showName, 
  showPoster,
  onClose 
}: EpisodeDetailModalProps) {
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [markAsWatched, setMarkAsWatched] = useState(false);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [episodeDetails, setEpisodeDetails] = useState<any>(null);

  useEffect(() => {
    loadEpisodeData();
  }, [episode.id]);

  const loadEpisodeData = async () => {
    try {
      // Load notification preferences
      const notifData = await apiCall(`/episode-notifications/${showId}/${episode.season_number}/${episode.episode_number}`);
      setNotificationEnabled(notifData.enabled || false);

      // Load watch status
      const watchData = await apiCall(`/watch-history/${showId}/${episode.season_number}/${episode.episode_number}`);
      setMarkAsWatched(watchData.watched || false);
      setRating(watchData.rating || 0);

      setEpisodeDetails(episode);
    } catch (error) {
      console.error('Error loading episode data:', error);
      setEpisodeDetails(episode);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotification = async () => {
    try {
      const newValue = !notificationEnabled;
      await apiCall('/episode-notifications', {
        method: 'POST',
        body: JSON.stringify({
          showId,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
          episodeName: episode.name,
          airDate: episode.air_date,
          enabled: newValue,
        }),
      });
      setNotificationEnabled(newValue);
      toast.success(newValue ? 'Notification enabled' : 'Notification disabled');
    } catch (error) {
      console.error('Error toggling notification:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleToggleWatched = async () => {
    try {
      const newValue = !markAsWatched;
      await apiCall('/watch-history', {
        method: 'POST',
        body: JSON.stringify({
          showId,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
          episodeName: episode.name,
          watched: newValue,
          rating: rating,
        }),
      });
      setMarkAsWatched(newValue);
      toast.success(newValue ? 'Marked as watched' : 'Marked as unwatched');
    } catch (error) {
      console.error('Error updating watch status:', error);
      toast.error('Failed to update watch status');
    }
  };

  const handleRating = async (newRating: number) => {
    try {
      setRating(newRating);
      await apiCall('/watch-history', {
        method: 'POST',
        body: JSON.stringify({
          showId,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
          episodeName: episode.name,
          watched: markAsWatched,
          rating: newRating,
        }),
      });
      toast.success('Rating saved');
    } catch (error) {
      console.error('Error saving rating:', error);
      toast.error('Failed to save rating');
    }
  };

  const formatAirDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isPast = date < now;
    
    return {
      formatted: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      }),
      isPast,
    };
  };

  const airDateInfo = episode.air_date ? formatAirDate(episode.air_date) : null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{episode.name}</DialogTitle>
          <DialogDescription>
            Episode details for {showName}
          </DialogDescription>
        </DialogHeader>

        {/* Episode Still/Poster */}
        <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500">
          {episode.still_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w780${episode.still_path}`}
              alt={episode.name}
              className="w-full h-full object-cover"
            />
          ) : showPoster ? (
            <img
              src={showPoster}
              alt={showName}
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tv className="w-16 h-16 text-white opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <ScrollArea className="max-h-[calc(90vh-12rem)]">
          <div className="p-6 space-y-4">
            {/* Title and Episode Info */}
            <div>
              <h2 className="text-2xl mb-1">{episode.name}</h2>
              <div className="text-sm text-gray-500">
                {showName} • S{episode.season_number}:E{episode.episode_number}
              </div>
            </div>

            {/* Air Date */}
            {airDateInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm">
                  {airDateInfo.isPast ? '📺 Aired' : '📅 Airs'}: {airDateInfo.formatted}
                </div>
              </div>
            )}

            {/* Notification Toggle - Only for upcoming episodes */}
            {airDateInfo && !airDateInfo.isPast && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {notificationEnabled ? (
                      <Bell className="w-5 h-5 text-purple-600" />
                    ) : (
                      <BellOff className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <div className="text-sm">Episode Notifications</div>
                      <div className="text-xs text-gray-500">
                        Get reminded when this episode airs
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={notificationEnabled}
                    onCheckedChange={handleToggleNotification}
                  />
                </div>
              </div>
            )}

            {/* Watch Status - For past episodes */}
            {airDateInfo && airDateInfo.isPast && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className={`w-5 h-5 ${markAsWatched ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-sm">Mark as Watched</div>
                      <div className="text-xs text-gray-500">
                        Track your viewing progress
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={markAsWatched}
                    onCheckedChange={handleToggleWatched}
                  />
                </div>
              </div>
            )}

            {/* Rating */}
            {airDateInfo && airDateInfo.isPast && (
              <div>
                <h3 className="text-sm mb-2">Rate this Episode</h3>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Overview */}
            {episode.overview && (
              <div>
                <h3 className="text-sm mb-2">Overview</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {episode.overview}
                </p>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {episode.runtime && (
                <div>
                  <div className="text-gray-500">Runtime</div>
                  <div>{episode.runtime} min</div>
                </div>
              )}
              {episode.vote_average > 0 && (
                <div>
                  <div className="text-gray-500">Rating</div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {episode.vote_average.toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
