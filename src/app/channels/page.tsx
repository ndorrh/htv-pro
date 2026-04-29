'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { Loader2, Search as SearchIcon, Filter } from 'lucide-react';
import { ChannelData as Channel } from '@/lib/iptvApi';

export default function AllChannelsPage() {
  useSpatialNavigation();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [page, setPage] = useState(1);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch metadata on mount
  useEffect(() => {
    async function fetchMeta() {
      try {
        const [catRes, countryRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/countries')
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (countryRes.ok) setCountries(await countryRes.json());
      } catch (err) {
        console.error("Failed to load metadata", err);
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, []);

  // Fetch channels function
  const fetchChannels = async (pageNum: number, category: string, country: string, isNewFilter: boolean) => {
    setLoadingChannels(true);
    try {
      const params = new URLSearchParams();
      if (category !== "All") params.append('category', category);
      if (country !== "All") params.append('country', country);
      params.append('page', pageNum.toString());
      params.append('limit', '40'); // Load 40 at a time

      const res = await fetch(`/api/channels?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedChannels = data.data || [];
        
        if (isNewFilter) {
          setChannels(fetchedChannels);
        } else {
          setChannels(prev => [...prev, ...fetchedChannels]);
        }
        
        setHasMore(fetchedChannels.length === 40); // If we got less than limit, there are no more
      }
    } catch (err) {
      console.error("Failed to load channels", err);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Effect to reset and fetch when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchChannels(1, selectedCategory, selectedCountry, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCountry]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingChannels) {
          setPage(prev => {
            const next = prev + 1;
            fetchChannels(next, selectedCategory, selectedCountry, false);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingChannels, selectedCategory, selectedCountry]);

  if (loadingMeta) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto pb-32">
      {/* Sticky Header with Filters */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 p-8 pt-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Browse All Channels</h1>
            <p className="text-zinc-400 mt-2">Discover thousands of global IPTV streams</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2">
              <Filter size={18} className="text-zinc-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-white focus:outline-none w-36 cursor-pointer"
                tabIndex={0}
              >
                <option value="All">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2">
              <Filter size={18} className="text-zinc-500" />
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="bg-transparent text-white focus:outline-none w-36 cursor-pointer"
                tabIndex={0}
              >
                <option value="All">All Regions</option>
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Channels */}
      <div className="p-8">
        {channels.length === 0 && !loadingChannels ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
            <SearchIcon size={64} className="mb-4 opacity-20" />
            <p className="text-2xl font-semibold">No channels found</p>
            <p className="text-zinc-600 mt-2">Try adjusting your category or region filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {channels.map((channel, i) => (
              <ChannelCard key={`${channel.id}-${i}`} channel={channel} />
            ))}
          </div>
        )}

        {/* Infinite Scroll Loader Target */}
        <div ref={observerTarget} className="w-full py-12 flex justify-center mt-4">
          {loadingChannels && (
            <div className="flex flex-col items-center text-zinc-500">
              <Loader2 className="animate-spin text-red-600 mb-2" size={32} />
              <span className="text-sm">Loading more channels...</span>
            </div>
          )}
          {!hasMore && channels.length > 0 && (
            <p className="text-zinc-600 text-sm">End of results</p>
          )}
        </div>
      </div>
    </div>
  );
}
