import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { SearchBar } from './SearchBar';
import { ShowDetailModal } from './ShowDetailModal';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Trash2, Calendar, Tv } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function ScheduleScreen() {
  const [myShows, setMyShows] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'schedule' | 'shows'>('schedule');
  const [detailItem, setDetailItem] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [showsData, scheduleData] = await Promise.all([
        apiCall('/my-shows'),
        apiCall('/schedule')
      ]);
      setMyShows(showsData.shows);
      setSchedule(scheduleData.schedule);
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

    return Object.entries(grouped).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
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
          <TabsTrigger value="shows" className="flex-1">
            My Shows ({myShows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
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
              <div className="divide-y divide-gray-200">
                {groupedSchedule.map(([date, items]) => (
                  <div key={date} className="bg-white">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="text-sm text-gray-900">{formatDate(date)}</div>
                      <div className="text-xs text-gray-500">{date}</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <div key={`${item.showId}-${item.episode.id}-${idx}`} className="p-4 flex gap-3">
                          <div className="flex-shrink-0">
                            {item.showPoster ? (
                              <img
                                src={item.showPoster}
                                alt={item.showName}
                                className="w-12 h-18 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
                                <Tv className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-1">{item.showName}</div>
                            <div className="text-sm text-gray-600 mb-1">
                              S{item.episode.season_number}:E{item.episode.episode_number} - {item.episode.name}
                            </div>
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="shows" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            {myShows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Tv className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No shows added yet</p>
                <p className="text-sm mt-2">Search and add TV shows above to start tracking</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 bg-white">
                {myShows.map((show) => (
                  <div key={show.id} className="p-4 flex gap-3">
                    <div className="flex-shrink-0">
                      {show.poster ? (
                        <img
                          src={show.poster}
                          alt={show.name}
                          className="w-16 h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                          <Tv className="w-8 h-8 text-gray-400" />
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
                        onClick={() => handleRemoveShow(show.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {detailItem && (
        <ShowDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirmAdd={(itemToAdd) => {
            handleAddShow(itemToAdd);
            setDetailItem(null);
          }}
          actionButtonText="Add to My Shows"
        />
      )}
    </div>
  );
}
