'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { ChannelData as Channel } from '@/lib/iptvApi';

export default function SearchPage() {
  useSpatialNavigation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setChannels([]);
      return;
    }

    async function fetchSearch() {
      setLoading(true);
      try {
        const res = await fetch(`/api/channels?search=${encodeURIComponent(searchQuery)}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.data || []);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(fetchSearch, 500); // 500ms debounce
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualization for channel list
  const itemsPerRow = 5;
  const rowCount = Math.ceil(channels.length / itemsPerRow);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  return (
    <div className="h-screen bg-zinc-950 flex flex-col pt-12 px-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-6">Search Channels</h1>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {loading ? (
              <Loader2 className="animate-spin text-zinc-400" size={24} />
            ) : (
              <SearchIcon className="text-zinc-400" size={24} />
            )}
          </div>
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl py-4 pl-12 pr-4 text-xl focus:outline-none focus:ring-2 focus:ring-red-600 transition-shadow"
            placeholder="Search by channel name or category..."
          />
        </div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        {searchQuery.trim() === "" ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <SearchIcon size={64} className="mb-4 opacity-20" />
            <p className="text-2xl font-semibold">What do you want to watch?</p>
            <p className="text-zinc-600 mt-2">Search across thousands of global channels</p>
          </div>
        ) : channels.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <p className="text-2xl font-semibold">No channels found</p>
            <p className="text-zinc-600 mt-2">Try adjusting your search terms</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * itemsPerRow;
              const rowChannels = channels.slice(startIdx, startIdx + itemsPerRow);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex space-x-6"
                >
                  {rowChannels.map((channel) => (
                    <div key={channel.id} style={{ width: 'calc(20% - 20px)' }}>
                      <ChannelCard channel={channel} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
