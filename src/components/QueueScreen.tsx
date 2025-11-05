import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { SearchBar } from './SearchBar';
import { ShowDetailModal } from './ShowDetailModal';
import { StreamingBadges } from './StreamingBadges';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Trash2, Star, Tv, Film as FilmIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner@2.0.3';

export function QueueScreen() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const data = await apiCall('/queue');
      setQueue(data.queue);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQueue = async (item: any) => {
    try {
      const result = await apiCall('/queue', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      if (result.alreadyExists) {
        toast.info('Already in your queue');
      } else {
        toast.success('Added to your queue!');
      }
      loadQueue();
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error adding to queue:', error);
    }
  };

  const handleRemoveFromQueue = async (item: any) => {
    try {
      await apiCall(`/queue/${item.type}/${item.id}`, {
        method: 'DELETE',
      });
      toast.success('Removed from queue');
      loadQueue();
    } catch (error) {
      console.error('Error removing from queue:', error);
    }
  };

  const handleRate = async () => {
    if (!selectedItem || rating === 0) return;

    try {
      await apiCall('/rate', {
        method: 'POST',
        body: JSON.stringify({
          itemId: selectedItem.id,
          itemType: selectedItem.type,
          rating,
          item: selectedItem,
        }),
      });
      toast.success('Rating saved!');
      setSelectedItem(null);
      setRating(0);
    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading queue...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white space-y-3">
        <h1 className="text-2xl">My Queue</h1>
        <SearchBar onSelect={setDetailItem} />
      </div>

      <ScrollArea className="flex-1 h-0 w-full">
        {queue.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Your queue is empty</p>
            <p className="text-sm mt-2">Search and add movies or TV shows above</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {queue.map((item) => (
              <Card 
                key={`${item.type}-${item.id}`} 
                className="p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setDetailItem(item)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-20 h-30 object-cover rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-30 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                        {item.type === 'movie' ? (
                          <FilmIcon className="w-10 h-10 text-purple-400" />
                        ) : (
                          <Tv className="w-10 h-10 text-purple-400" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">{item.title}</div>
                    <div className="text-sm text-gray-500 mb-2">
                      {item.type === 'movie' ? 'Movie' : 'TV Show'} • {item.releaseDate?.split('-')[0] || 'N/A'}
                    </div>
                    {item.overview && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.overview}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Rate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromQueue(item);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Detail Modal */}
      {detailItem && (
        <ShowDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirmAdd={(itemToAdd) => {
            handleAddToQueue(itemToAdd);
            setDetailItem(null);
          }}
        />
      )}

      {/* Rating Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Rate {selectedItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <Button onClick={handleRate} className="w-full" disabled={rating === 0}>
              Save Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
