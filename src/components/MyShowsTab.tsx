import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  Tv, 
  Trash2, 
  MoreVertical, 
  Calendar,
  TrendingUp,
  Clock,
  PlayCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface MyShowsTabProps {
  shows: any[];
  onRemove: (showId: number) => void;
  onShowDetail: (show: any) => void;
}

export function MyShowsTab({ shows, onRemove, onShowDetail }: MyShowsTabProps) {
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'recent' | 'nextEpisode'>('recent');
  const [filterBy, setFilterBy] = useState<'all' | 'airing' | 'ended'>('all');

  // Calculate overall statistics
  const stats = {
    totalShows: shows.length,
    totalEpisodes: shows.reduce((sum, show) => sum + (show.seasonData?.watchedCount || 0), 0),
    currentlyAiring: shows.filter(s => s.status === 'Returning Series').length,
    totalWatchTime: shows.reduce((sum, show) => {
      const episodeRuntime = 45; // Approximate
      return sum + (show.seasonData?.watchedCount || 0) * episodeRuntime;
    }, 0)
  };

  // Filter shows
  const filteredShows = shows.filter(show => {
    if (filterBy === 'airing') return show.status === 'Returning Series';
    if (filterBy === 'ended') return show.status === 'Ended';
    return true;
  });

  // Sort shows
  const sortedShows = [...filteredShows].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'progress') {
      return (b.seasonData?.progress || 0) - (a.seasonData?.progress || 0);
    }
    if (sortBy === 'nextEpisode') {
      const aDate = a.nextEpisodeToAir?.air_date || '9999-12-31';
      const bDate = b.nextEpisodeToAir?.air_date || '9999-12-31';
      return aDate.localeCompare(bDate);
    }
    // Default: recent (by addedAt)
    return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
  });

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Returning Series') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'Ended') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Statistics Summary */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl mb-1">{stats.totalShows}</div>
            <div className="text-xs text-gray-500">Shows Tracked</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl mb-1">{stats.totalEpisodes}</div>
            <div className="text-xs text-gray-500">Episodes Watched</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl mb-1">{formatWatchTime(stats.totalWatchTime)}</div>
            <div className="text-xs text-gray-500">Watch Time</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl mb-1">{stats.currentlyAiring}</div>
            <div className="text-xs text-gray-500">Currently Airing</div>
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="p-4 border-b border-gray-200 bg-white space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            variant={filterBy === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('all')}
          >
            All ({shows.length})
          </Button>
          <Button
            variant={filterBy === 'airing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('airing')}
          >
            Airing ({stats.currentlyAiring})
          </Button>
          <Button
            variant={filterBy === 'ended' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('ended')}
          >
            Ended
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="recent">Recently Added</option>
            <option value="name">Name</option>
            <option value="progress">Progress</option>
            <option value="nextEpisode">Next Episode</option>
          </select>
        </div>
      </div>

      {/* Shows List */}
      <ScrollArea className="flex-1">
        {sortedShows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Tv className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No shows match your filters</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {sortedShows.map((show) => (
              <Card key={`${show.id}-${show.selectedSeason}`} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Poster */}
                    <div 
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => onShowDetail(show)}
                    >
                      {show.poster ? (
                        <img
                          src={show.poster}
                          alt={show.name}
                          className="w-20 h-28 object-cover rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-28 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                          <Tv className="w-8 h-8 text-purple-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title & Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="text-base mb-1 cursor-pointer hover:text-purple-600 transition-colors"
                            onClick={() => onShowDetail(show)}
                          >
                            {show.name}
                          </h3>
                          {show.seasonName && (
                            <div className="text-xs text-gray-500 mb-1">
                              {show.seasonName}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onShowDetail(show)}>
                              <Info className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onRemove(show.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Show
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status & Genre Badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {show.status && (
                          <Badge variant="outline" className={`text-xs ${getStatusColor(show.status)}`}>
                            {show.status === 'Returning Series' ? 'On Air' : show.status}
                          </Badge>
                        )}
                        {show.genres && show.genres.slice(0, 2).map((genre: any) => (
                          <Badge key={genre.id} variant="secondary" className="text-xs">
                            {genre.name}
                          </Badge>
                        ))}
                      </div>

                      {/* Progress Bar */}
                      {show.seasonData && show.seasonData.episodeCount > 0 && (
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {show.seasonData.watchedCount} / {show.seasonData.episodeCount} episodes
                            </span>
                            <span className="text-purple-600">
                              {Math.round(show.seasonData.progress)}%
                            </span>
                          </div>
                          <Progress value={show.seasonData.progress} className="h-2" />
                        </div>
                      )}

                      {/* Next Episode Info */}
                      {show.seasonData?.nextUnwatchedEpisode && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-3">
                          <div className="flex items-start gap-2">
                            <PlayCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs mb-0.5">Continue Watching:</div>
                              <div className="text-sm">
                                S{show.seasonData.nextUnwatchedEpisode.season_number}:E{show.seasonData.nextUnwatchedEpisode.episode_number} - {show.seasonData.nextUnwatchedEpisode.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Next Airing Episode */}
                      {show.nextEpisodeToAir && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-600 mb-0.5">Next Episode:</div>
                              <div className="text-sm">
                                S{show.nextEpisodeToAir.season_number}:E{show.nextEpisodeToAir.episode_number}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(show.nextEpisodeToAir.air_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fully Watched */}
                      {show.seasonData && show.seasonData.progress === 100 && !show.nextEpisodeToAir && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700">Season Complete!</span>
                          </div>
                        </div>
                      )}

                      {/* Streaming Providers */}
                      {show.providers && show.providers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Watch on:</span>
                          <div className="flex items-center gap-1">
                            {show.providers.slice(0, 4).map((provider: any) => (
                              <img
                                key={provider.provider_id}
                                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                alt={provider.provider_name}
                                className="w-6 h-6 rounded shadow-sm"
                                title={provider.provider_name}
                              />
                            ))}
                            {show.providers.length > 4 && (
                              <span className="text-xs text-gray-500 ml-1">
                                +{show.providers.length - 4}
                              </span>
                            )}
                          </div>
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
    </div>
  );
}
