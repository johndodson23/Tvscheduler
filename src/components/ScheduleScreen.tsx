import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../utils/api';
import { SearchBar } from './SearchBar';
import { ShowDetailModal } from './ShowDetailModal';
import { ShowOnboardingModal } from './ShowOnboardingModal';
import { EpisodeDetailModal } from './EpisodeDetailModal';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Trash2, Calendar, Tv, Check, Star } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function ScheduleScreen() {
  const [myShows, setMyShows] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [watchList, setWatchList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'schedule' | 'shows' | 'watchlist'>('schedule');
  const [detailItem, setDetailItem] = useState<any>(null);
  const [onboardingItem, setOnboardingItem] = useState<any>(null);
  const [episodeDetail, setEpisodeDetail] = useState<any>(null);
  const [providers, setProviders] = useState<{ [key: number]: any[] }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [showsData, scheduleData, watchListData] = await Promise.all([
        apiCall('/my-shows'),
        apiCall('/schedule'),
        apiCall('/watch-list')
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

  const handleAddShow = async (item: any) => {
    try {
      await apiCall('/my-shows', {
        method: 'POST',
        body: JSON.stringify({
          id: item.id,
          name: item.title,
          poster: item.poster,
          selectedSeason: item.selectedSeason,
          seasonName: item.seasonName,
        }),
      });
      const seasonText = item.seasonName ? ` (${item.seasonName})` : '';
      toast.success(`Added to your shows!${seasonText}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error adding show:', error);
    }
  };

  const handleRemoveShow = async (showId: number) => {
    try {
      await apiCall(`/my-shows/${showId}`, {
        method: 'DELETE',
      });
      toast.success('Removed from your shows');
      loadData();
    } catch (error) {
      console.error('Error removing show:', error);
    }
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
          <ScrollArea className="h-full w-full">
            {myShows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Tv className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No shows added yet</p>
                <p className="text-sm mt-2">Search and add TV shows above to start tracking</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {myShows.map((show) => (
                  <Card key={show.id} className="p-4 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {show.poster ? (
                          <img
                            src={show.poster}
                            alt={show.name}
                            className="w-16 h-24 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                            <Tv className="w-8 h-8 text-purple-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1">{show.name}</div>
                        {show.seasonName && (
                          <div className="text-sm text-gray-500 mb-2">
                            Tracking: {show.seasonName}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveShow(show.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Show Detail Modal (for preview only, clicking "Add" opens onboarding) */}
      {detailItem && (
        <ShowDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirmAdd={(itemToAdd) => {
            setDetailItem(null);
            // Check if it's a TV show, if so use onboarding flow
            if (itemToAdd.type === 'tv') {
              setOnboardingItem(itemToAdd);
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
            setOnboardingItem(null);
            loadData();
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
