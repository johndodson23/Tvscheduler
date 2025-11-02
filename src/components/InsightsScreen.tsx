import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Tv, 
  Clock, 
  DollarSign, 
  Award,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  PieChart
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export function InsightsScreen() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await apiCall('/analytics');
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading insights...</div>
      </div>
    );
  }

  if (!analytics || analytics.summary.totalEpisodes === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-2xl">Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Your viewing analytics</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500 max-w-sm">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No viewing data yet</p>
            <p className="text-sm">Start watching shows and marking episodes as watched to see your personalized insights and recommendations!</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, platforms, topShows, recommendations } = analytics;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl">Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Your streaming analytics & recommendations</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl">{summary.totalEpisodes}</div>
                <Tv className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-sm text-gray-700">Episodes Watched</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl">{formatTime(summary.totalMinutes)}</div>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-gray-700">Watch Time</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl">{summary.totalShows}</div>
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-sm text-gray-700">Shows Tracked</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl">{platforms.length}</div>
                <PieChart className="w-5 h-5 text-pink-600" />
              </div>
              <div className="text-sm text-gray-700">Services Used</div>
            </Card>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Recommendations
              </h2>
              {recommendations.map((rec: any, index: number) => (
                <Card key={index} className={`p-4 border-l-4 ${
                  rec.type === 'remove' ? 'border-l-orange-500 bg-orange-50' :
                  rec.type === 'primary' ? 'border-l-green-500 bg-green-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start gap-3">
                    {rec.type === 'remove' ? (
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm mb-2">{rec.message}</p>
                      {rec.savings && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">Potential savings: ~${rec.savings}/month</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Platform Breakdown */}
          <div className="space-y-3">
            <h2 className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Platform Breakdown
            </h2>
            
            {/* Pie Chart */}
            <Card className="p-4">
              <div className="mb-3">
                <h3 className="text-sm mb-1">Watch Time Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie
                    data={platforms}
                    dataKey="timePercentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.timePercentage}%`}
                    labelLine={false}
                  >
                    {platforms.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </Card>

            {/* Platform Cards */}
            {platforms.map((platform: any, index: number) => (
              <Card key={platform.name} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <h3 className="text-base">{platform.name}</h3>
                    </div>
                    <div className="text-sm text-gray-500">
                      {platform.showCount} show{platform.showCount !== 1 ? 's' : ''} • {formatTime(platform.totalMinutes)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3">
                    {platform.timePercentage}%
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Episodes watched:</span>
                    <span>{platform.episodesWatched}</span>
                  </div>
                  
                  {platform.showTitles.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Shows:</div>
                      <div className="flex flex-wrap gap-1">
                        {platform.showTitles.slice(0, 5).map((title: string) => (
                          <Badge key={title} variant="outline" className="text-xs">
                            {title}
                          </Badge>
                        ))}
                        {platform.showTitles.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{platform.showTitles.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${platform.timePercentage}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Top Shows */}
          <div className="space-y-3">
            <h2 className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Most Watched Shows
            </h2>
            <Card className="divide-y divide-gray-100">
              {topShows.slice(0, 5).map((show: any, index: number) => (
                <div key={show.id} className="p-4 flex gap-3">
                  <div className="flex-shrink-0 flex items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm
                      ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'}
                    `}>
                      #{index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">{show.name}</div>
                    <div className="text-sm text-gray-500">
                      {show.episodesWatched} episode{show.episodesWatched !== 1 ? 's' : ''} watched
                    </div>
                    {show.providers.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {show.providers.map((provider: string) => (
                          <Badge key={provider} variant="outline" className="text-xs">
                            {provider}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {show.poster && (
                    <img
                      src={show.poster}
                      alt={show.name}
                      className="w-12 h-16 object-cover rounded shadow-sm"
                    />
                  )}
                </div>
              ))}
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
