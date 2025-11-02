import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { MultiSeasonActionModal } from './MultiSeasonActionModal';
import { apiCall } from '../utils/api';
import { SERVICE_LOGOS } from '../utils/streaming-services';
import { Film, Tv, Star, Loader2, Calendar, Check, Settings2 } from 'lucide-react';

interface ShowDetailModalProps {
  item: any;
  onClose: () => void;
  onConfirmAdd: (itemToAdd: any) => void;
  actionButtonText?: string;
}

export function ShowDetailModal({ item, onClose, onConfirmAdd, actionButtonText = 'Add to Queue' }: ShowDetailModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [showMultiSeasonConfig, setShowMultiSeasonConfig] = useState(false);

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
          const latestSeasonNumber = regularSeasons[regularSeasons.length - 1].season_number;
          setSelectedSeason(latestSeasonNumber);
          setSelectedSeasons([latestSeasonNumber]);
        }
      }
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    console.log('handleAdd called:', { multiSelectMode, selectedSeasons });
    
    if (multiSelectMode && selectedSeasons.length > 0) {
      // Show configuration modal for multiple seasons
      console.log('Opening multi-season config modal for seasons:', selectedSeasons);
      setShowMultiSeasonConfig(true);
    } else {
      // Add single season
      const itemToAdd = {
        ...item,
        selectedSeason: item.type === 'tv' ? selectedSeason : undefined,
        seasonName: item.type === 'tv' && details?.seasons 
          ? details.seasons.find((s: any) => s.season_number === selectedSeason)?.name 
          : undefined,
      };
      console.log('Adding single item:', itemToAdd);
      onConfirmAdd(itemToAdd);
    }
  };

  const handleMultiSeasonConfig = (config: {
    tracked: number[];
    watched: { seasonNumber: number; rating: number }[];
  }) => {
    const seasonNames: { [key: number]: string } = {};
    [...config.tracked, ...config.watched.map(w => w.seasonNumber)].forEach(seasonNum => {
      const season = details?.seasons.find((s: any) => s.season_number === seasonNum);
      if (season) {
        seasonNames[seasonNum] = season.name;
      }
    });
    
    const itemToAdd = {
      ...item,
      multiSeasonConfig: config,
      seasonNames: seasonNames,
    };
    onConfirmAdd(itemToAdd);
  };

  const toggleSeasonSelection = (seasonNumber: number) => {
    setSelectedSeasons(prev => 
      prev.includes(seasonNumber)
        ? prev.filter(s => s !== seasonNumber)
        : [...prev, seasonNumber]
    );
  };

  const isSeasonCurrent = (season: any) => {
    if (!details) return false;
    
    // Check if this is the latest season with upcoming episodes
    const regularSeasons = details.seasons?.filter((s: any) => s.season_number > 0) || [];
    const latestSeason = regularSeasons[regularSeasons.length - 1];
    
    return (
      season.season_number === latestSeason?.season_number &&
      (details.status === 'Returning Series' || details.next_episode_to_air)
    );
  };

  const providers = details?.['watch/providers']?.results?.US?.flatrate || [];
  const relevantProviders = providers.slice(0, 6); // Show max 6

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>
            Details and information about {item.title}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            {/* Backdrop/Poster */}
            <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
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

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl">{item.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
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
                </div>

                {/* Quick Tips for TV Shows */}
                {item.type === 'tv' && details?.seasons && details.seasons.filter((s: any) => s.season_number > 0).length > 1 && !multiSelectMode && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-700 text-xs leading-relaxed">
                        <strong>💡 Pro Tip:</strong> Want to add multiple seasons at once (like seasons you've already watched)? Use "Select Multiple" below to configure watch status and ratings for each season.
                      </div>
                    </div>
                  </div>
                )}

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
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm">Select Season{multiSelectMode ? 's' : ''}</h3>
                        {!multiSelectMode && details.seasons.filter((s: any) => s.season_number > 0).length > 1 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            💡 Want to add multiple? Click "Select Multiple" →
                          </p>
                        )}
                      </div>
                      <Button
                        variant={multiSelectMode ? 'default' : 'outline'}
                        size="sm"
                        className={multiSelectMode ? 'bg-purple-600 hover:bg-purple-700' : ''}
                        onClick={() => {
                          setMultiSelectMode(!multiSelectMode);
                          if (!multiSelectMode) {
                            // Entering multi-select mode - keep current selection
                            if (!selectedSeasons.includes(selectedSeason)) {
                              setSelectedSeasons([selectedSeason]);
                            }
                          } else {
                            // Exiting multi-select mode - use first selected or default
                            if (selectedSeasons.length > 0) {
                              setSelectedSeason(selectedSeasons[0]);
                            }
                          }
                        }}
                      >
                        {multiSelectMode ? 'Single Select' : 'Select Multiple'}
                      </Button>
                    </div>

                    {!multiSelectMode ? (
                      <>
                        <Select
                          value={selectedSeason.toString()}
                          onValueChange={(value) => {
                            const num = parseInt(value);
                            setSelectedSeason(num);
                            setSelectedSeasons([num]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {details.seasons
                              .filter((season: any) => season.season_number > 0)
                              .map((season: any) => {
                                const isCurrent = isSeasonCurrent(season);
                                return (
                                  <SelectItem
                                    key={season.season_number}
                                    value={season.season_number.toString()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{season.name} ({season.episode_count} episodes)</span>
                                      {isCurrent && (
                                        <Calendar className="w-3 h-3 text-green-600" />
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                        {isSeasonCurrent(details.seasons.find((s: any) => s.season_number === selectedSeason)) && (
                          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Current season - new episodes will be tracked
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {details.seasons
                            .filter((season: any) => season.season_number > 0)
                            .map((season: any) => {
                              const isCurrent = isSeasonCurrent(season);
                              const isSelected = selectedSeasons.includes(season.season_number);
                              
                              return (
                                <button
                                  key={season.season_number}
                                  onClick={() => toggleSeasonSelection(season.season_number)}
                                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{season.name}</span>
                                        {isCurrent && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                            <Calendar className="w-3 h-3" />
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {season.episode_count} episode{season.episode_count !== 1 ? 's' : ''}
                                        {isCurrent && ' • New episodes tracked'}
                                        {!isCurrent && season.air_date && ` • Aired ${new Date(season.air_date).getFullYear()}`}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center ml-2">
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                        
                        {/* Next Step Indicator */}
                        {selectedSeasons.length > 0 && (
                          <div className="mt-3 p-4 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400 rounded-lg shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Check className="w-4 h-4 text-purple-700" />
                                  <span className="text-sm text-purple-900">
                                    {selectedSeasons.length} season{selectedSeasons.length !== 1 ? 's' : ''} selected
                                  </span>
                                </div>
                                <div className="text-xs text-purple-700 mb-2">
                                  Click "Configure" below to set ratings & watch status
                                </div>
                                {/* Preview of selected seasons */}
                                <div className="flex flex-wrap gap-1">
                                  {selectedSeasons.slice(0, 5).map(num => {
                                    const season = details.seasons.find((s: any) => s.season_number === num);
                                    return (
                                      <span key={num} className="inline-block px-2 py-0.5 bg-white/80 text-purple-800 text-[10px] rounded-full border border-purple-300">
                                        S{num}
                                      </span>
                                    );
                                  })}
                                  {selectedSeasons.length > 5 && (
                                    <span className="inline-block px-2 py-0.5 bg-white/80 text-purple-800 text-[10px] rounded-full border border-purple-300">
                                      +{selectedSeasons.length - 5}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Settings2 className="w-6 h-6 text-purple-600 flex-shrink-0" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {!multiSelectMode && (
                      <p className="text-xs text-gray-500 mt-2">
                        You can add other seasons later
                      </p>
                    )}
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

            {/* Footer with Add Button - ALWAYS VISIBLE */}
            <div className={`p-4 border-t-2 flex-shrink-0 ${
              item.type === 'tv' && multiSelectMode && selectedSeasons.length > 0 
                ? 'border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              {item.type === 'tv' && multiSelectMode && selectedSeasons.length > 0 && (
                <div className="mb-3 p-2 bg-white/80 rounded border border-purple-200">
                  <div className="text-xs text-purple-900">
                    <strong>Next Step:</strong> Click the button below to:
                  </div>
                  <ul className="text-xs text-purple-700 mt-1 ml-4 space-y-0.5">
                    <li>• Set ratings for each season (1-10 scale)</li>
                    <li>• Mark which seasons you've already watched</li>
                    <li>• Choose which seasons to track for new episodes</li>
                  </ul>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAdd} 
                  className={`flex-1 gap-2 transition-all ${
                    item.type === 'tv' && multiSelectMode && selectedSeasons.length > 0
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                      : ''
                  }`}
                  disabled={item.type === 'tv' && multiSelectMode && selectedSeasons.length === 0}
                  size={item.type === 'tv' && multiSelectMode && selectedSeasons.length > 0 ? 'lg' : 'default'}
                >
                  {item.type === 'tv' && multiSelectMode && selectedSeasons.length > 0 ? (
                    <>
                      <Settings2 className="w-5 h-5" />
                      Configure {selectedSeasons.length} Season{selectedSeasons.length !== 1 ? 's' : ''}
                    </>
                  ) : (
                    actionButtonText
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      {/* Multi-Season Configuration Modal */}
      {showMultiSeasonConfig && (
        <MultiSeasonActionModal
          show={item}
          selectedSeasons={selectedSeasons.map(num => {
            const season = details?.seasons.find((s: any) => s.season_number === num);
            return {
              ...season,
              isCurrent: isSeasonCurrent(season)
            };
          })}
          onClose={() => setShowMultiSeasonConfig(false)}
          onConfirm={(config) => {
            console.log('Config confirmed, closing modal and processing...');
            setShowMultiSeasonConfig(false);
            onClose(); // Close the detail modal
            handleMultiSeasonConfig(config);
          }}
        />
      )}
    </Dialog>
  );
}
