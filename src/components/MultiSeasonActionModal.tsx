import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Calendar, Check, Star, PlayCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface MultiSeasonActionModalProps {
  show: any;
  selectedSeasons: any[];
  onClose: () => void;
  onConfirm: (seasonsConfig: {
    tracked: number[];
    watched: { seasonNumber: number; rating: number }[];
  }) => void;
}

interface SeasonConfig {
  seasonNumber: number;
  seasonName: string;
  episodeCount: number;
  isCurrent: boolean;
  action: 'track' | 'watched' | 'both';
  rating: number;
}

export function MultiSeasonActionModal({ 
  show, 
  selectedSeasons, 
  onClose, 
  onConfirm 
}: MultiSeasonActionModalProps) {
  const [configs, setConfigs] = useState<SeasonConfig[]>(() => {
    return selectedSeasons.map(season => {
      // Smart defaults: 
      // - Current/active season → "both" (mark past as watched, track future)
      // - Old seasons → "watched" (already seen them)
      const defaultAction = season.isCurrent ? 'both' : 'watched';
      
      return {
        seasonNumber: season.season_number,
        seasonName: season.name,
        episodeCount: season.episode_count,
        isCurrent: season.isCurrent,
        action: defaultAction as 'track' | 'watched' | 'both',
        rating: 7
      };
    });
  });

  const updateConfig = (index: number, updates: Partial<SeasonConfig>) => {
    setConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = { ...newConfigs[index], ...updates };
      return newConfigs;
    });
  };

  const handleConfirm = () => {
    const tracked: number[] = [];
    const watched: { seasonNumber: number; rating: number }[] = [];

    configs.forEach(config => {
      if (config.action === 'track' || config.action === 'both') {
        tracked.push(config.seasonNumber);
      }
      if (config.action === 'watched' || config.action === 'both') {
        watched.push({
          seasonNumber: config.seasonNumber,
          rating: config.rating
        });
      }
    });

    console.log('Multi-season config:', { tracked, watched, configs });
    onConfirm({ tracked, watched });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'track': return 'Track for Episodes';
      case 'watched': return 'Mark as Watched';
      case 'both': return 'Both';
      default: return '';
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="sr-only">
          <DialogTitle>Configure {configs.length} Season{configs.length !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>Configure multiple seasons with ratings and watch status</DialogDescription>
        </div>
        <div className="p-6 pb-4 border-b-2 border-purple-200 bg-purple-50 flex-shrink-0">
          <h2 className="text-xl">Configure {configs.length} Season{configs.length !== 1 ? 's' : ''}</h2>
          <div className="space-y-2">
            <div className="text-sm">For each season, choose what to do:</div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="font-medium">📺 Track</div>
                <div className="text-gray-600">Follow episodes</div>
              </div>
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="font-medium">✅ Watched</div>
                <div className="text-gray-600">Already seen all</div>
              </div>
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="font-medium">✅📺 Both</div>
                <div className="text-gray-600">Seen + track new</div>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-4">
            {configs.map((config, index) => (
              <div key={config.seasonNumber} className="border border-gray-200 rounded-lg p-4 space-y-4">
                {/* Season Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base">{config.seasonName}</h3>
                      {config.isCurrent && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Calendar className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {config.episodeCount} episode{config.episodeCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Action Selection */}
                <div>
                  <div className="text-sm mb-2">What would you like to do with this season?</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={config.action === 'track' ? 'default' : 'outline'}
                      className="flex-col h-auto py-3 items-start"
                      onClick={() => updateConfig(index, { action: 'track' })}
                    >
                      <PlayCircle className="w-5 h-5 mb-1" />
                      <span className="text-xs">Track Episodes</span>
                      <span className="text-[10px] text-gray-500 mt-1">Add to schedule</span>
                    </Button>
                    <Button
                      variant={config.action === 'watched' ? 'default' : 'outline'}
                      className="flex-col h-auto py-3 items-start"
                      onClick={() => updateConfig(index, { action: 'watched' })}
                    >
                      <Check className="w-5 h-5 mb-1" />
                      <span className="text-xs">Already Watched</span>
                      <span className="text-[10px] text-gray-500 mt-1">Mark all as seen</span>
                    </Button>
                  </div>

                  {/* "Both" option for current seasons */}
                  {config.isCurrent && (
                    <Button
                      variant={config.action === 'both' ? 'default' : 'outline'}
                      className="w-full mt-2 flex-col h-auto py-3"
                      onClick={() => updateConfig(index, { action: 'both' })}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="w-5 h-5" />
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      <span className="text-xs">Watched Past + Track Future</span>
                      <span className="text-[10px] text-gray-500 mt-1">Check each episode individually</span>
                    </Button>
                  )}
                  
                  {/* Explanation */}
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600">
                    {config.action === 'track' && (
                      <>✓ Adds season to My Shows • Episodes will appear in your schedule</>
                    )}
                    {config.action === 'watched' && (
                      <>✓ Adds to My Shows • All {config.episodeCount} episodes marked as watched with your rating</>
                    )}
                    {config.action === 'both' && (
                      <>✓ Adds to My Shows • Aired episodes marked watched • Upcoming episodes in schedule</>
                    )}
                  </div>
                </div>

                {/* Rating Selection (if watched) */}
                {(config.action === 'watched' || config.action === 'both') && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <div className="text-sm">Rate this season:</div>
                    
                    {/* Quick rating buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={config.rating <= 4 ? 'default' : 'outline'}
                        size="sm"
                        className={`flex items-center justify-center gap-1 ${
                          config.rating <= 4 ? 'bg-orange-500 hover:bg-orange-600' : ''
                        }`}
                        onClick={() => updateConfig(index, { rating: 3 })}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span className="text-xs">Meh (3)</span>
                      </Button>
                      <Button
                        variant={config.rating >= 5 && config.rating <= 7 ? 'default' : 'outline'}
                        size="sm"
                        className={`flex items-center justify-center gap-1 ${
                          config.rating >= 5 && config.rating <= 7 ? 'bg-blue-500 hover:bg-blue-600' : ''
                        }`}
                        onClick={() => updateConfig(index, { rating: 6 })}
                      >
                        👍
                        <span className="text-xs">Good (6)</span>
                      </Button>
                      <Button
                        variant={config.rating >= 8 ? 'default' : 'outline'}
                        size="sm"
                        className={`flex items-center justify-center gap-1 ${
                          config.rating >= 8 ? 'bg-green-500 hover:bg-green-600' : ''
                        }`}
                        onClick={() => updateConfig(index, { rating: 9 })}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs">Great (9)</span>
                      </Button>
                    </div>

                    {/* Fine-tune slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">Fine-tune:</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{config.rating}/10</span>
                        </div>
                      </div>
                      <Slider
                        value={[config.rating]}
                        onValueChange={(values) => updateConfig(index, { rating: values[0] })}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer - ALWAYS VISIBLE */}
        <div className="p-6 pt-4 border-t border-gray-200 flex-shrink-0">
          {/* Summary */}
          <div className="mb-4 p-3 bg-purple-50 rounded-lg text-sm">
            <div className="mb-2">📋 Summary:</div>
            <ul className="space-y-1 text-xs text-gray-700">
              {configs.some(c => c.action === 'track' || c.action === 'both') && (
                <li>
                  • {configs.filter(c => c.action === 'track' || c.action === 'both').length} season{configs.filter(c => c.action === 'track' || c.action === 'both').length !== 1 ? 's' : ''} will be tracked for episodes
                </li>
              )}
              {configs.some(c => c.action === 'watched') && (
                <li>
                  • {configs.filter(c => c.action === 'watched' && c.action !== 'both').length} season{configs.filter(c => c.action === 'watched' && c.action !== 'both').length !== 1 ? 's' : ''} will be marked as fully watched
                </li>
              )}
              {configs.some(c => c.action === 'both') && (
                <li>
                  • {configs.filter(c => c.action === 'both').length} active season{configs.filter(c => c.action === 'both').length !== 1 ? 's' : ''} will have aired episodes marked watched
                </li>
              )}
              <li className="text-purple-700 mt-2">
                ✓ All {configs.length} season{configs.length !== 1 ? 's' : ''} will appear in "My Shows"
              </li>
            </ul>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} size="lg">
              Add {configs.length} Season{configs.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
