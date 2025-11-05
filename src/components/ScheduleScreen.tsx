import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../utils/api';
import { SearchBar } from './SearchBar';
import { ShowDetailModal } from './ShowDetailModal';
import { ShowOnboardingModal } from './ShowOnboardingModal';
import { EpisodeDetailModal } from './EpisodeDetailModal';
import { SimilarShowsRating } from './SimilarShowsRating';
import { MyShowsTab } from './MyShowsTab';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Trash2, Calendar, Tv, Check, Star } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function ScheduleScreen() {
  const [myShows, setMyShows] = useState<any[]>([]);
  const [myShowsDetailed, setMyShowsDetailed] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [watchList, setWatchList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [activeView, setActiveView] = useState<'schedule' | 'shows' | 'watchlist'>('schedule');
  const [detailItem, setDetailItem] = useState<any>(null);
  const [onboardingItem, setOnboardingItem] = useState<any>(null);
  const [similarRatingItem, setSimilarRatingItem] = useState<any>(null);
  const [episodeDetail, setEpisodeDetail] = useState<any>(null);
  const [providers, setProviders] = useState<{ [key: number]: any[] }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Load detailed show info when switching to My Shows tab
    if (activeView === 'shows' && myShowsDetailed.length === 0 && myShows.length > 0) {
      loadDetailedShows();
    }
  }, [activeView, myShows]);

  const loadData = async () => {
    try {
      const [showsData, scheduleData, watchListData] = await Promise.all([
        apiCall('/my-shows').catch(err => {
          console.error('Error loading my-shows:', err);
          return { shows: [] };
        }),
        apiCall('/schedule').catch(err => {
          console.error('Error loading schedule:', err);
          return { schedule: [] };
        }),
        apiCall('/watch-list').catch(err => {
          console.error('Error loading watch-list:', err);
          return { episodes: [] };
        })
      ]);
      setMyShows(showsData.shows);
      setSchedule(scheduleData.schedule);
      setWatchList(watchListData.episodes || []);
      
      // Load streaming providers for all shows
      const uniqueShowIds = [...new Set(scheduleData.schedule.map((s: any) => s.showId))];
      const providerPromises = uniqueShowIds.map(async (showId: number) => {
        try {
          const data = await apiCall(`/tmdb/details/tv/${showId}`);
          const usProviders = data['watch/providers']?.results?.US?.flatrate || [];
          return { showId, providers: usProviders };
        } catch (error) {
          return { showId, providers: [] };
        }
      });
      
      const providerResults = await Promise.all(providerPromises);
      const providerMap: { [key: number]: any[] } = {};
      providerResults.forEach(({ showId, providers }) => {
        providerMap[showId] = providers;
      });
      setProviders(providerMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedShows = async () => {
    setLoadingDetailed(true);
    try {
      const data = await apiCall('/my-shows-detailed');
      setMyShowsDetailed(data.shows);
    } catch (error) {
      console.error('Error loading detailed shows:', error);
      toast.error('Failed to load show details');
    } finally {
      setLoadingDetailed(false);
    }
  };

  const handleAddShow = async (item: any) => {
    try {
      // Handle multi-season configuration
      if (item.multiSeasonConfig) {
        const { tracked, watched } = item.multiSeasonConfig;
        
        // Show loading toast for multi-season operations
        const toastId = toast.loading('Adding seasons and updating watch history...');
        
        // Collect all unique seasons to add to My Shows
        const allSeasonNums = new Set([...tracked, ...watched.map(w => w.seasonNumber)]);
        
        // Add ALL seasons to My Shows (both tracked and watched)
        for (const seasonNum of allSeasonNums) {
          try {
            const result = await apiCall('/my-shows', {
              method: 'POST',
              body: JSON.stringify({
                id: item.id,
                name: item.title,
                poster: item.poster,
                selectedSeason: seasonNum,
                seasonName: item.seasonNames?.[seasonNum],
              }),
            });
            if (result.alreadyExists) {
              console.log(`Season ${seasonNum} already tracked, skipping`);
            }
          } catch (err: any) {
            console.log(`Error adding season ${seasonNum}:`, err);
          }
        }
        
        // Mark watched seasons and bulk mark episodes as watched
        for (const watchedSeason of watched) {
          try {
            // Get season details to get all episodes
            const seasonDetails = await apiCall(`/tmdb/tv/${item.id}/season/${watchedSeason.seasonNumber}`);
            
            // Check if this season is in "tracked" too (meaning "both" was selected)
            const isBothMode = tracked.includes(watchedSeason.seasonNumber);
            
            if (isBothMode) {
              // For "both" mode: Mark episodes that have already aired as watched
              // Future episodes will show up in schedule automatically
              const now = new Date();
              let markedCount = 0;
              
              for (const episode of seasonDetails.episodes || []) {
                // Check if episode has aired
                const airDate = episode.air_date ? new Date(episode.air_date) : null;
                
                if (airDate && airDate <= now) {
                  // Episode has aired - mark as watched with rating
                  try {
                    await apiCall('/watch-history', {
                      method: 'POST',
                      body: JSON.stringify({
                        showId: item.id,
                        seasonNumber: watchedSeason.seasonNumber,
                        episodeNumber: episode.episode_number,
                        episodeName: episode.name,
                        watched: true,
                        rating: watchedSeason.rating
                      })
                    });
                    markedCount++;
                  } catch (err) {
                    console.log(`Error marking episode ${episode.episode_number} as watched:`, err);
                  }
                }
                // Else: Episode hasn't aired yet, will show in schedule
              }
              
              console.log(`Season ${watchedSeason.seasonNumber}: Marked ${markedCount} aired episodes as watched`);
            } else {
              // For "watched only" mode: bulk mark ALL episodes as watched
              for (const episode of seasonDetails.episodes || []) {
                await apiCall('/watch-history', {
                  method: 'POST',
                  body: JSON.stringify({
                    showId: item.id,
                    seasonNumber: watchedSeason.seasonNumber,
                    episodeNumber: episode.episode_number,
                    episodeName: episode.name,
                    watched: true,
                    rating: watchedSeason.rating
                  })
                });
              }
            }
          } catch (err: any) {
            console.log(`Error processing season ${watchedSeason.seasonNumber}:`, err);
          }
        }
        
        const totalSeasons = allSeasonNums.size;
        const onlyWatchedCount = watched.filter(w => !tracked.includes(w.seasonNumber)).length;
        const bothCount = watched.filter(w => tracked.includes(w.seasonNumber)).length;
        
        let message = `Added ${totalSeasons} season${totalSeasons !== 1 ? 's' : ''}!`;
        if (onlyWatchedCount > 0) {
          message += ` Marked ${onlyWatchedCount} as watched.`;
        }
        if (bothCount > 0) {
          message += ` Tracking ${bothCount} active season${bothCount !== 1 ? 's' : ''}.`;
        }
        
        toast.dismiss(toastId);
        toast.success(message);
      }
      // Handle simple multiple seasons (old behavior)
      else if (item.multipleSeasons && Array.isArray(item.multipleSeasons)) {
        let addedCount = 0;
        for (const seasonNum of item.multipleSeasons) {
          try {
            const result = await apiCall('/my-shows', {
              method: 'POST',
              body: JSON.stringify({
                id: item.id,
                name: item.title,
                poster: item.poster,
                selectedSeason: seasonNum,
                seasonName: item.seasonNames?.[seasonNum],
              }),
            });
            if (!result.alreadyExists) {
              addedCount++;
            }
          } catch (err: any) {
            // Log but continue with other seasons
            console.log(`Error adding season ${seasonNum}:`, err);
          }
        }
        if (addedCount > 0) {
          toast.success(`Added ${addedCount} season${addedCount !== 1 ? 's' : ''} to your shows!`);
        } else {
          toast.info('All selected seasons are already in your shows');
        }
      } else {
        // Single season add
        const result = await apiCall('/my-shows', {
          method: 'POST',
          body: JSON.stringify({
            id: item.id,
            name: item.title,
            poster: item.poster,
            selectedSeason: item.selectedSeason,
            seasonName: item.seasonName,
          }),
        });
        
        if (result.alreadyExists) {
          const seasonText = item.seasonName ? ` (${item.seasonName})` : '';
          toast.info(`This show${seasonText} is already in your list`);
        } else {
          const seasonText = item.seasonName ? ` (${item.seasonName})` : '';
          toast.success(`Added to your shows!${seasonText}`);
        }
      }
      loadData();
    } catch (error: any) {
      // Make sure to dismiss any loading toasts
      toast.dismiss();
      toast.error(error.message || 'Error adding show');
      console.error('Error adding show:', error);
    }
  };

  const handleRemoveShow = async (showId: number) => {
    try {
      await apiCall(`/my-shows/${showId}`, {
        method: 'DELETE',
      });
      toast.success('Removed from your shows');
      // Clear detailed shows so they reload next time
      setMyShowsDetailed([]);
      loadData();
    } catch (error) {
      console.error('Error removing show:', error);
    }
  };

  const handleShowDetail = (show: any) => {
    // Convert show format to match ShowDetailModal expectations
    setDetailItem({
      id: show.id,
      title: show.name,
      poster: show.poster,
      type: 'tv'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const groupScheduleByDate = () => {
    const grouped: { [key: string]: any[] } = {};
    
    schedule.forEach(item => {
      const date = item.airDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    // Sort by date - most recent first (reverse chronological for upcoming, show today first)
    const sorted = Object.entries(grouped).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
    
    // Find today's index and reorder to show today/upcoming first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIndex = sorted.findIndex(([date]) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    });
    
    // If we found today or a future date, start from there
    if (todayIndex !== -1) {
      return sorted.slice(todayIndex);
    }
    
    return sorted;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading schedule...</div>
      </div>
    );
  }

  const groupedSchedule = groupScheduleByDate();
  const upcomingEpisodes = schedule.filter(s => s.type === 'upcoming');
  const recentEpisodes = schedule.filter(s => s.type === 'recent');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl">My Schedule</h1>
            <p className="text-sm text-gray-500 mt-1">
              {myShows.length} show{myShows.length !== 1 ? 's' : ''} tracked • {upcomingEpisodes.length} upcoming
            </p>
          </div>
          <Calendar className="w-6 h-6 text-purple-600" />
        </div>
        <SearchBar 
          onSelect={setDetailItem} 
          placeholder="Add TV show to schedule..." 
          tvOnly={true}
        />
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b border-gray-200">
          <TabsTrigger value="schedule" className="flex-1">
            Schedule ({schedule.length})
          </TabsTrigger>
          <TabsTrigger value="watchlist" className="flex-1">
            Watch List
          </TabsTrigger>
          <TabsTrigger value="shows" className="flex-1">
            My Shows ({myShows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="flex-1 mt-0 overflow-hidden h-0">
          <ScrollArea className="h-full w-full">
            {schedule.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No upcoming episodes</p>
                <p className="text-sm mt-2 mb-4 max-w-xs mx-auto">
                  Add TV shows using the search bar above to see when new episodes are coming out
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-sm mx-auto">
                  <div className="text-sm mb-1">💡 Try adding:</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• The Last of Us</li>
                    <li>• House of the Dragon</li>
                    <li>• The Bear</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {groupedSchedule.map(([date, items]) => (
                  <div key={date} className="space-y-3">
                    <div className="sticky top-0 bg-white z-10 py-2">
                      <div className="text-sm">{formatDate(date)}</div>
                      <div className="text-xs text-gray-500">{date}</div>
                    </div>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <Card 
                          key={`${item.showId}-${item.episode.id}-${idx}`} 
                          className="p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => setEpisodeDetail({
                            episode: item.episode,
                            showId: item.showId,
                            showName: item.showName,
                            showPoster: item.showPoster,
                          })}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0">
                              {item.showPoster ? (
                                <img
                                  src={item.showPoster}
                                  alt={item.showName}
                                  className="w-16 h-24 object-cover rounded-lg shadow-sm"
                                />
                              ) : (
                                <div className="w-16 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                                  <Tv className="w-8 h-8 text-purple-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="mb-1">{item.showName}</div>
                              <div className="text-sm text-gray-600 mb-2">
                                S{item.episode.season_number}:E{item.episode.episode_number} - {item.episode.name}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.type === 'upcoming' && (
                                  <div className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                    Upcoming
                                  </div>
                                )}
                                {item.type === 'recent' && new Date(item.airDate) <= new Date() && (
                                  <div className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                    Available Now
                                  </div>
                                )}
                                {providers[item.showId] && providers[item.showId].length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {providers[item.showId].slice(0, 3).map((provider: any) => (
                                      <div key={provider.provider_id} className="relative group">
                                        <img
                                          src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                          alt={provider.provider_name}
                                          className="w-6 h-6 rounded shadow-sm"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="watchlist" className="flex-1 mt-0 overflow-hidden h-0">
          <ScrollArea className="h-full w-full">
            {watchList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Tv className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No episodes to watch</p>
                <p className="text-sm mt-2 max-w-xs mx-auto">
                  Episodes from your tracked shows will appear here for you to mark as watched and rate
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {watchList.map((item: any, idx: number) => (
                  <Card 
                    key={`${item.showId}-${item.episode.id}-${idx}`} 
                    className="p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setEpisodeDetail({
                      episode: item.episode,
                      showId: item.showId,
                      showName: item.showName,
                      showPoster: item.showPoster,
                    })}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {item.episode.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${item.episode.still_path}`}
                            alt={item.episode.name}
                            className="w-24 h-16 object-cover rounded-lg shadow-sm"
                          />
                        ) : item.showPoster ? (
                          <img
                            src={item.showPoster}
                            alt={item.showName}
                            className="w-24 h-16 object-cover rounded-lg shadow-sm opacity-60"
                          />
                        ) : (
                          <div className="w-24 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                            <Tv className="w-8 h-8 text-purple-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500 mb-1">{item.showName}</div>
                        <div className="mb-1">
                          S{item.episode.season_number}:E{item.episode.episode_number} - {item.episode.name}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {item.watched && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              <Check className="w-3 h-3" />
                              Watched
                            </div>
                          )}
                          {item.rating > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                              <Star className="w-3 h-3 fill-yellow-600" />
                              {item.rating}
                            </div>
                          )}
                          {item.episode.air_date && (
                            <div className="text-xs text-gray-500">
                              {new Date(item.episode.air_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="shows" className="flex-1 mt-0 overflow-hidden h-0">
          {myShows.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="p-8 text-center text-gray-500">
                <Tv className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No shows added yet</p>
                <p className="text-sm mt-2">Search and add TV shows above to start tracking</p>
              </div>
            </div>
          ) : loadingDetailed && myShowsDetailed.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500">Loading show details...</div>
            </div>
          ) : (
            <MyShowsTab 
              shows={myShowsDetailed.length > 0 ? myShowsDetailed : myShows}
              onRemove={handleRemoveShow}
              onShowDetail={handleShowDetail}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Show Detail Modal (for preview only, clicking "Add" opens onboarding) */}
      {detailItem && (
        <ShowDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirmAdd={(itemToAdd) => {
            setDetailItem(null);
            // Check if it's a TV show
            if (itemToAdd.type === 'tv') {
              // If multiple seasons selected, add them directly (user knows what they want)
              if (itemToAdd.multipleSeasons && itemToAdd.multipleSeasons.length > 0) {
                handleAddShow(itemToAdd);
              } else {
                // Single season - use onboarding flow for better UX
                setOnboardingItem(itemToAdd);
              }
            } else {
              // For movies, just add directly
              handleAddShow(itemToAdd);
            }
          }}
          actionButtonText="Add to My Shows"
        />
      )}

      {/* Show Onboarding Modal (for TV shows) */}
      {onboardingItem && (
        <ShowOnboardingModal
          show={onboardingItem}
          onClose={() => setOnboardingItem(null)}
          onComplete={() => {
            const completedShow = onboardingItem;
            setOnboardingItem(null);
            setMyShowsDetailed([]); // Clear to force reload
            loadData();
            // Show similar shows rating flow
            setSimilarRatingItem(completedShow);
          }}
        />
      )}

      {/* Similar Shows Rating Modal */}
      {similarRatingItem && (
        <SimilarShowsRating
          show={similarRatingItem}
          showType={similarRatingItem.type || 'tv'}
          onClose={() => setSimilarRatingItem(null)}
          onComplete={() => {
            setSimilarRatingItem(null);
          }}
        />
      )}

      {/* Episode Detail Modal */}
      {episodeDetail && (
        <EpisodeDetailModal
          episode={episodeDetail.episode}
          showId={episodeDetail.showId}
          showName={episodeDetail.showName}
          showPoster={episodeDetail.showPoster}
          onClose={() => {
            setEpisodeDetail(null);
            loadData(); // Refresh data after closing
          }}
        />
      )}
    </div>
  );
}
