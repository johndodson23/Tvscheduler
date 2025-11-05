import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ThumbsUp, ThumbsDown, Sparkles, Loader2 } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface ShowOnboardingModalProps {
  show: any;
  onClose: () => void;
  onComplete: () => void;
}

type OnboardingStep = 'check-status' | 'ask-watched' | 'select-seasons' | 'rate-seasons' | 'adding';

export function ShowOnboardingModal({ show, onClose, onComplete }: ShowOnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>('check-status');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveReleases, setHasActiveReleases] = useState(false);
  const [hasWatched, setHasWatched] = useState<boolean | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [seasonRatings, setSeasonRatings] = useState<{ [key: number]: 'love' | 'like' | 'dislike' }>({});
  
  useEffect(() => {
    checkShowStatus();
  }, []);

  const checkShowStatus = async () => {
    try {
      // For movies, this modal shouldn't be used - but handle it just in case
      if (show.type === 'movie') {
        toast.error('This modal is only for TV shows');
        onClose();
        return;
      }

      const data = await apiCall(`/tmdb/details/${show.type}/${show.id}`);
      setDetails(data);
      
      // Check if show has active releases
      const isActive = data.status === 'Returning Series' || 
                       (data.next_episode_to_air !== null && data.next_episode_to_air !== undefined);
      
      setHasActiveReleases(isActive);
      
      if (isActive) {
        // If show has active releases, just add the latest season
        const regularSeasons = data.seasons?.filter((s: any) => s.season_number > 0) || [];
        if (regularSeasons.length > 0) {
          const latestSeason = regularSeasons[regularSeasons.length - 1].season_number;
          await addShowWithSeason(latestSeason);
        }
      } else {
        // Show has ended or no active releases, ask if they've watched it
        setStep('ask-watched');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking show status:', error);
      toast.error('Failed to load show details');
      setLoading(false);
    }
  };

  const addShowWithSeason = async (seasonNumber: number) => {
    try {
      const seasonData = details?.seasons?.find((s: any) => s.season_number === seasonNumber);
      const result = await apiCall('/my-shows', {
        method: 'POST',
        body: JSON.stringify({
          id: show.id,
          name: show.title,
          poster: show.poster,
          type: 'tv',
          selectedSeason: seasonNumber,
          seasonName: seasonData?.name,
        }),
      });
      
      if (result.alreadyExists) {
        toast.info(`${show.title} is already in your shows!`);
      } else {
        toast.success(`${show.title} added to your shows!`);
      }
      onComplete();
    } catch (error: any) {
      console.error('Error adding show:', error);
      toast.error(error.message || 'Failed to add show');
    }
  };

  const handleWatchedResponse = (watched: boolean) => {
    setHasWatched(watched);
    if (watched) {
      // They've watched it, show season selection
      setStep('select-seasons');
      const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
      // Pre-select all seasons
      setSelectedSeasons(regularSeasons.map((s: any) => s.season_number));
    } else {
      // They haven't watched it, add all episodes to watch list
      setStep('adding');
      addAllToWatchList();
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    setSelectedSeasons(prev => 
      prev.includes(seasonNumber) 
        ? prev.filter(s => s !== seasonNumber)
        : [...prev, seasonNumber]
    );
  };

  const handleContinueToRating = () => {
    if (selectedSeasons.length === 0) {
      toast.error('Please select at least one season');
      return;
    }
    setStep('rate-seasons');
  };

  const setSeasonRating = (seasonNumber: number, rating: 'love' | 'like' | 'dislike') => {
    setSeasonRatings(prev => ({ ...prev, [seasonNumber]: rating }));
  };

  const handleCompleteRating = async () => {
    setStep('adding');
    
    // Check if all selected seasons have ratings
    const unratedSeasons = selectedSeasons.filter(s => !seasonRatings[s]);
    if (unratedSeasons.length > 0) {
      toast.error('Please rate all selected seasons');
      setStep('rate-seasons');
      return;
    }

    try {
      // Add show to my-shows with all seasons
      for (const seasonNumber of selectedSeasons) {
        const seasonData = details?.seasons?.find((s: any) => s.season_number === seasonNumber);
        try {
          await apiCall('/my-shows', {
            method: 'POST',
            body: JSON.stringify({
              id: show.id,
              name: show.title,
              poster: show.poster,
              type: 'tv',
              selectedSeason: seasonNumber,
              seasonName: seasonData?.name,
            }),
          });
        } catch (err) {
          // Ignore duplicate errors
          console.log(`Season ${seasonNumber} already added or error:`, err);
        }
      }

      // Get all episodes for the selected seasons and add to watch history with ratings
      for (const seasonNumber of selectedSeasons) {
        try {
          const seasonDetails = await apiCall(`/tmdb/tv/${show.id}/season/${seasonNumber}`);
          const rating = seasonRatings[seasonNumber];
          
          // Add each episode to watch history
          for (const episode of seasonDetails.episodes || []) {
            try {
              await apiCall('/watch-history', {
                method: 'POST',
                body: JSON.stringify({
                  showId: show.id,
                  seasonNumber,
                  episodeNumber: episode.episode_number,
                  episodeName: episode.name,
                  watched: true,
                  rating: rating === 'love' ? 10 : rating === 'like' ? 7 : 4,
                }),
              });
            } catch (err) {
              console.log(`Error adding episode ${episode.episode_number}:`, err);
            }
          }
        } catch (err) {
          console.error(`Error processing season ${seasonNumber}:`, err);
        }
      }

      toast.success(`${show.title} added with ${selectedSeasons.length} season(s) marked as watched!`);
      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup');
      setStep('rate-seasons');
    }
  };

  const addAllToWatchList = async () => {
    try {
      const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
      
      // Add show for each season
      for (const season of regularSeasons) {
        try {
          await apiCall('/my-shows', {
            method: 'POST',
            body: JSON.stringify({
              id: show.id,
              name: show.title,
              poster: show.poster,
              type: 'tv',
              selectedSeason: season.season_number,
              seasonName: season.name,
            }),
          });
        } catch (err) {
          // Ignore duplicate errors
          console.log(`Season ${season.season_number} already added or error:`, err);
        }
      }

      toast.success(`${show.title} added! All episodes are in your watch list.`);
      onComplete();
    } catch (error: any) {
      console.error('Error adding to watch list:', error);
      toast.error('Failed to add to watch list');
    }
  };

  if (loading || step === 'check-status') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="sr-only">
            <DialogTitle>Setting up show</DialogTitle>
            <DialogDescription>Loading show details and configuring {show.title}</DialogDescription>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">Setting up {show.title}...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'adding') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="sr-only">
            <DialogTitle>Adding show</DialogTitle>
            <DialogDescription>Adding {show.title} to your shows</DialogDescription>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">Adding to your shows...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'ask-watched') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Have you watched {show.title}?</DialogTitle>
            <DialogDescription>
              This show has no current releases. Let us know if you've already seen it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              {show.poster && (
                <img
                  src={show.poster}
                  alt={show.title}
                  className="w-16 h-24 object-cover rounded-lg shadow-sm"
                />
              )}
              <div className="flex-1">
                <div className="mb-1">{show.title}</div>
                <div className="text-sm text-gray-500">
                  {details?.number_of_seasons} season{details?.number_of_seasons !== 1 ? 's' : ''} • {details?.number_of_episodes} episodes
                </div>
                {details?.status && (
                  <div className="text-sm text-gray-500 mt-1">
                    Status: {details.status}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={() => handleWatchedResponse(true)} className="w-full">
              Yes, I've watched it
            </Button>
            <Button onClick={() => handleWatchedResponse(false)} variant="outline" className="w-full">
              No, add to watch list
            </Button>
            <Button onClick={onClose} variant="ghost" className="w-full">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'select-seasons') {
    const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
    
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Which seasons have you watched?</DialogTitle>
            <DialogDescription>
              Select the seasons you've already seen
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] px-6">
            <div className="space-y-2 py-4">
              {regularSeasons.map((season: any) => (
                <button
                  key={season.season_number}
                  onClick={() => toggleSeason(season.season_number)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedSeasons.includes(season.season_number)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>{season.name}</div>
                      <div className="text-sm text-gray-500">
                        {season.episode_count} episode{season.episode_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {selectedSeasons.includes(season.season_number) && (
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50 flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleContinueToRating}
              disabled={selectedSeasons.length === 0}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'rate-seasons') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>How did you like each season?</DialogTitle>
            <DialogDescription>
              This helps us give you better recommendations
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] px-6">
            <div className="space-y-4 py-4">
              {selectedSeasons.map((seasonNumber) => {
                const season = details?.seasons?.find((s: any) => s.season_number === seasonNumber);
                const rating = seasonRatings[seasonNumber];
                
                return (
                  <div key={seasonNumber} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <div>{season?.name}</div>
                      <div className="text-sm text-gray-500">
                        {season?.episode_count} episode{season?.episode_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSeasonRating(seasonNumber, 'love')}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          rating === 'love'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-1">
                            <ThumbsUp className={`w-5 h-5 ${rating === 'love' ? 'text-green-600 fill-green-600' : 'text-gray-400'}`} />
                            <ThumbsUp className={`w-5 h-5 ${rating === 'love' ? 'text-green-600 fill-green-600' : 'text-gray-400'}`} />
                          </div>
                          <span className={`text-xs ${rating === 'love' ? 'text-green-600' : 'text-gray-500'}`}>
                            Loved it
                          </span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setSeasonRating(seasonNumber, 'like')}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          rating === 'like'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <ThumbsUp className={`w-5 h-5 ${rating === 'like' ? 'text-blue-600 fill-blue-600' : 'text-gray-400'}`} />
                          <span className={`text-xs ${rating === 'like' ? 'text-blue-600' : 'text-gray-500'}`}>
                            Liked it
                          </span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setSeasonRating(seasonNumber, 'dislike')}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          rating === 'dislike'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <ThumbsDown className={`w-5 h-5 ${rating === 'dislike' ? 'text-red-600 fill-red-600' : 'text-gray-400'}`} />
                          <span className={`text-xs ${rating === 'dislike' ? 'text-red-600' : 'text-gray-500'}`}>
                            Not for me
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50 flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteRating}
              disabled={selectedSeasons.some(s => !seasonRatings[s])}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
