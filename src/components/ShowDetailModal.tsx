import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { apiCall } from '../utils/api';
import { Film, Tv, Star, Loader2 } from 'lucide-react';

interface ShowDetailModalProps {
  item: any;
  onClose: () => void;
  onConfirmAdd: (itemToAdd: any) => void;
  actionButtonText?: string;
}

const SERVICE_LOGOS: { [key: number]: string } = {
  8: 'Netflix',
  119: 'Prime Video',
  337: 'Disney+',
  15: 'Hulu',
  350: 'Apple TV+',
  1899: 'Max',
  531: 'Paramount+',
  387: 'Peacock',
  384: 'HBO Max',
};

export function ShowDetailModal({ item, onClose, onConfirmAdd, actionButtonText = 'Add to Queue' }: ShowDetailModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  useEffect(() => {
    loadDetails();
  }, [item.id, item.type]);

  const loadDetails = async () => {
    try {
      const data = await apiCall(`/tmdb/details/${item.type}/${item.id}`);
      setDetails(data);
      // Default to the latest season
      if (data.seasons && data.seasons.length > 0) {
        // Filter out season 0 (specials) and set to last season
        const regularSeasons = data.seasons.filter((s: any) => s.season_number > 0);
        if (regularSeasons.length > 0) {
          setSelectedSeason(regularSeasons[regularSeasons.length - 1].season_number);
        }
      }
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const itemToAdd = {
      ...item,
      selectedSeason: item.type === 'tv' ? selectedSeason : undefined,
      seasonName: item.type === 'tv' && details?.seasons 
        ? details.seasons.find((s: any) => s.season_number === selectedSeason)?.name 
        : undefined,
    };
    onConfirmAdd(itemToAdd);
  };

  const providers = details?.['watch/providers']?.results?.US?.flatrate || [];
  const relevantProviders = providers.slice(0, 6); // Show max 6

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            {/* Backdrop/Poster */}
            <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500">
              {details?.backdrop_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w780${details.backdrop_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : details?.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {item.type === 'movie' ? (
                    <Film className="w-16 h-16 text-white opacity-50" />
                  ) : (
                    <Tv className="w-16 h-16 text-white opacity-50" />
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <ScrollArea className="max-h-[calc(90vh-12rem)]">
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{item.title}</DialogTitle>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{item.type === 'movie' ? 'Movie' : 'TV Show'}</span>
                    {details?.release_date && (
                      <>
                        <span>•</span>
                        <span>{details.release_date.split('-')[0]}</span>
                      </>
                    )}
                    {details?.first_air_date && (
                      <>
                        <span>•</span>
                        <span>{details.first_air_date.split('-')[0]}</span>
                      </>
                    )}
                    {details?.vote_average > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{details.vote_average.toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </DialogHeader>

                {/* Overview */}
                {details?.overview && (
                  <div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {details.overview}
                    </p>
                  </div>
                )}

                {/* Where to Watch */}
                {relevantProviders.length > 0 && (
                  <div>
                    <h3 className="text-sm mb-2">Where to Watch</h3>
                    <div className="flex flex-wrap gap-2">
                      {relevantProviders.map((provider: any) => (
                        <div
                          key={provider.provider_id}
                          className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg"
                        >
                          {provider.logo_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                              alt={provider.provider_name}
                              className="w-6 h-6 rounded"
                            />
                          )}
                          <span className="text-sm">
                            {SERVICE_LOGOS[provider.provider_id] || provider.provider_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Season Selector for TV Shows */}
                {item.type === 'tv' && details?.seasons && details.seasons.length > 0 && (
                  <div>
                    <h3 className="text-sm mb-2">Select Season</h3>
                    <Select
                      value={selectedSeason.toString()}
                      onValueChange={(value) => setSelectedSeason(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {details.seasons
                          .filter((season: any) => season.season_number > 0)
                          .map((season: any) => (
                            <SelectItem
                              key={season.season_number}
                              value={season.season_number.toString()}
                            >
                              {season.name} ({season.episode_count} episodes)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-2">
                      You can add other seasons later
                    </p>
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {details?.number_of_seasons && (
                    <div>
                      <div className="text-gray-500">Seasons</div>
                      <div>{details.number_of_seasons}</div>
                    </div>
                  )}
                  {details?.number_of_episodes && (
                    <div>
                      <div className="text-gray-500">Episodes</div>
                      <div>{details.number_of_episodes}</div>
                    </div>
                  )}
                  {details?.runtime && (
                    <div>
                      <div className="text-gray-500">Runtime</div>
                      <div>{details.runtime} min</div>
                    </div>
                  )}
                  {details?.status && (
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div>{details.status}</div>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {details?.genres && details.genres.length > 0 && (
                  <div>
                    <h3 className="text-sm mb-2">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                      {details.genres.map((genre: any) => (
                        <span
                          key={genre.id}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer with Add Button */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAdd} className="flex-1">
                  {actionButtonText}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
