'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Folder, ArrowLeft } from 'lucide-react';
import { ChannelData as Channel } from '@/lib/iptvApi';

export default function AllChannelsPage() {
  useSpatialNavigation();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) setCategories(await res.json());
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, []);

  // Fetch channels when a category is selected
  useEffect(() => {
    if (!selectedCategory) return;
    
    async function fetchChannels() {
      setLoadingChannels(true);
      try {
        const res = await fetch(`/api/channels?category=${encodeURIComponent(selectedCategory)}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load channels", err);
      } finally {
        setLoadingChannels(false);
      }
    }
    fetchChannels();
  }, [selectedCategory]);

  // Virtualization for channel list
  const itemsPerRow = 5;
  const rowCount = Math.ceil(channels.length / itemsPerRow);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  if (loadingMeta) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

  // View 1: Category Selection Grid
  if (!selectedCategory) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-12 pb-32">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Categories</h1>
            <p className="text-zinc-400 mt-2">Select a category to browse channels</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-red-600/10 hover:border-red-600/50 focus:bg-red-600/20 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/30 transition-all group"
            >
              <Folder className="w-12 h-12 text-zinc-500 mb-4 group-hover:text-red-500 group-focus:text-red-500 transition-colors" />
              <h3 className="text-xl font-bold text-white">{cat.name}</h3>
              <p className="text-zinc-500 mt-2 text-sm max-w-[200px] mx-auto leading-relaxed">
                {cat.description || "Browse channels"}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // View 2: Channel List inside a Category
  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      <div className="p-8 pb-4 flex flex-col border-b border-zinc-800 shrink-0">
        <button 
          onClick={() => {
            setSelectedCategory(null);
            setChannels([]);
          }}
          className="flex w-max items-center space-x-2 text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Categories</span>
        </button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">{categories.find(c => c.id === selectedCategory)?.name}</h1>
            <p className="text-zinc-400 mt-2">{channels.length} channels loaded</p>
          </div>
        </div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto px-8 py-8 pb-32">
        {loadingChannels ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-red-600" size={48} />
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
