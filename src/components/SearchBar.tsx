import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { apiCall } from '../utils/api';
import { ScrollArea } from './ui/scroll-area';

interface SearchBarProps {
  onSelect: (item: any) => void;
  placeholder?: string;
}

export function SearchBar({ onSelect, placeholder = 'Search movies & TV shows...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall(`/tmdb/search?query=${encodeURIComponent(searchQuery)}&type=multi`);
      const filtered = data.results.filter((item: any) => 
        item.media_type === 'movie' || item.media_type === 'tv'
      );
      setResults(filtered);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    onSelect({
      id: item.id,
      type: item.media_type,
      title: item.title || item.name,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
      backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : null,
      overview: item.overview,
      releaseDate: item.release_date || item.first_air_date,
    });
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          <ScrollArea className="h-96">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Searching...</div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {results.map((item) => (
                  <button
                    key={`${item.media_type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className="w-full p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {item.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                        alt={item.title || item.name}
                        className="w-12 h-18 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div>{item.title || item.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.media_type === 'movie' ? 'Movie' : 'TV Show'} • {item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'N/A'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">No results found</div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
