'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Folder, ArrowLeft } from 'lucide-react';

export default function AllChannelsPage() {
  useSpatialNavigation();
  const { allChannels: channels, isLoadingChannels: loading, loadChannels } = useStore();
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const activeUrl = localStorage.getItem('htv-custom-m3u');
    if (activeUrl) {
      loadChannels([activeUrl]);
    } else {
      loadChannels();
    }
  }, [loadChannels]);

  const uniqueCountries = useMemo(() => Array.from(new Set(channels.map(c => c.country))).filter(Boolean).sort(), [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => selectedCountry === "All" || c.country === selectedCountry);
  }, [channels, selectedCountry]);

  // Group channels by category
  const categories = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredChannels.forEach(c => {
      groups[c.group] = (groups[c.group] || 0) + 1;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]); // Sort by channel count
  }, [filteredChannels]);

  // For the active category view
  const activeCategoryChannels = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredChannels.filter(c => c.group === selectedCategory);
  }, [filteredChannels, selectedCategory]);

  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualization for channel list
  const itemsPerRow = 5;
  const rowCount = Math.ceil(activeCategoryChannels.length / itemsPerRow);
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
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {selectedCategory ? selectedCategory : "Browse Categories"}
          </h1>
          <p className="text-zinc-400">
            {selectedCategory 
              ? `${activeCategoryChannels.length.toLocaleString()} channels available` 
              : `Showing ${filteredChannels.length.toLocaleString()} channels across ${categories.length} categories`}
          </p>
        </div>

        <div className="flex space-x-4">
          {selectedCategory && (
            <button 
              tabIndex={0}
              onClick={() => setSelectedCategory(null)}
              className="flex items-center space-x-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors focus:ring-4 focus:ring-red-600 focus:outline-none"
            >
              <ArrowLeft size={20} />
              <span>Back to Categories</span>
            </button>
          )}

          <select 
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setSelectedCategory(null); // Reset category when changing country
            }}
            className="bg-zinc-900 text-white border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-600 focus:outline-none"
          >
            <option value="All">All Countries</option>
            {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto overflow-x-hidden relative scroll-smooth pb-20">
        {!selectedCategory ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {categories.map(([catName, count]) => (
              <button
                key={catName}
                tabIndex={0}
                onClick={() => setSelectedCategory(catName)}
                className="bg-zinc-900 border border-zinc-800 hover:border-red-500 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all hover:scale-105 focus:scale-105 focus:outline-none focus:ring-4 focus:ring-red-600 group"
              >
                <Folder className="text-zinc-500 group-hover:text-red-500 group-focus:text-red-500 mb-4" size={48} />
                <h3 className="text-white font-bold text-lg">{catName}</h3>
                <p className="text-zinc-400 text-sm mt-1">{count.toLocaleString()} Channels</p>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * itemsPerRow;
              const rowChannels = activeCategoryChannels.slice(startIndex, startIndex + itemsPerRow);
              
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
