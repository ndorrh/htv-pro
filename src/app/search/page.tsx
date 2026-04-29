'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Channel } from '@/lib/m3uParser';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  useSpatialNavigation();
  const { allChannels: channels, isLoadingChannels: loading, loadChannels } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const activeUrl = localStorage.getItem('htv-custom-m3u');
    if (activeUrl) {
      loadChannels([activeUrl]);
    } else {
      loadChannels();
    }
  }, [loadChannels]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return channels.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.group && c.group.toLowerCase().includes(query)) ||
      (c.country && c.country.toLowerCase().includes(query))
    );
  }, [channels, searchQuery]);

  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualization for channel list
  const itemsPerRow = 5;
  const rowCount = Math.ceil(filteredChannels.length / itemsPerRow);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col pt-12 px-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-6">Search Channels</h1>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="text-zinc-500" size={24} />
          </div>
          <input
            type="text"
            autoFocus
            placeholder="Search by name, category, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors shadow-lg"
          />
        </div>
        
        {searchQuery.trim() && (
          <p className="text-zinc-400 mt-4">
            Found {filteredChannels.length.toLocaleString()} results for "{searchQuery}"
          </p>
        )}
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto overflow-x-hidden relative scroll-smooth pb-20">
        {!searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <SearchIcon size={64} className="mb-4 opacity-50" />
            <p className="text-xl">Type to start searching</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <p className="text-xl">No channels found</p>
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * itemsPerRow;
              const rowChannels = filteredChannels.slice(startIndex, startIndex + itemsPerRow);
              
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex space-x-4 mb-4"
                >
                  {rowChannels.map((channel) => (
                    <div key={channel.id} className="w-[calc(20%-1rem)]">
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
