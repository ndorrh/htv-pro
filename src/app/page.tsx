'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { ChannelData as Channel } from '@/lib/iptvApi';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import HeroPlayer from '@/components/ui/HeroPlayer';
import ChannelRow from '@/components/ui/ChannelRow';
import { Search, Loader2 } from 'lucide-react';

export default function Home() {
  // Initialize spatial navigation for Smart TVs
  useSpatialNavigation();

  const { history, favorites } = useStore();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [heroIndex, setHeroIndex] = useState(0);

  // Fetch metadata once
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [catRes, countryRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/countries')
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (countryRes.ok) setCountries(await countryRes.json());
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch channels when filters change
  useEffect(() => {
    async function fetchChannels() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "All") params.append('category', selectedCategory);
        if (selectedCountry !== "All") params.append('country', selectedCountry);
        params.append('limit', '50'); // Just top 50 for the home page

        const res = await fetch(`/api/channels?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load channels", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Slight debounce for fetching to avoid jitter when quickly changing dropdowns
    const timeout = setTimeout(fetchChannels, 300);
    return () => clearTimeout(timeout);
  }, [selectedCategory, selectedCountry]);

  // Group channels for rows (group by category)
  const groupedChannels = useMemo(() => {
    const groups: Record<string, Channel[]> = {};
    channels.forEach(c => {
      // Use the first category as the group, or "Uncategorized"
      const cat = c.categories && c.categories.length > 0 ? c.categories[0] : 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    });
    return groups;
  }, [channels]);

  // Rotate hero player every 15 seconds if multiple channels are available
  useEffect(() => {
    if (channels.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(channels.length, 10));
    }, 15000);
    return () => clearInterval(interval);
  }, [channels]);


  if (loading && channels.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-zinc-400">
        <Loader2 className="animate-spin w-12 h-12 mb-4 text-red-600" />
        <p className="text-xl">Loading IPTV Channels...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-950 pb-20 scrollbar-hide">
      
      {/* Search / Filter Bar */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-zinc-950/90 to-transparent pt-6 pb-8 px-12 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center space-x-4 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl">
          <Search size={18} className="text-zinc-400" />
          <input 
            type="text"
            placeholder="Quick search..."
            className="bg-transparent border-none text-white focus:outline-none w-48 text-sm placeholder-zinc-500"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/search';
            }}
            readOnly
          />
        </div>
        
        <div className="pointer-events-auto flex space-x-4">
          <select 
            className="bg-zinc-900 text-white border border-zinc-800 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            tabIndex={0}
          >
            <option value="All">All Regions</option>
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>

          <select 
            className="bg-zinc-900 text-white border border-zinc-800 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            tabIndex={0}
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Section */}
      <div className="-mt-24 mb-12">
        <HeroPlayer channel={channels[heroIndex]} />
      </div>

      {/* Dynamic Content Rows */}
      <div className="space-y-4">
        {/* User History Row (if exists) */}
        {history.length > 0 && selectedCategory === "All" && selectedCountry === "All" && (
          <ChannelRow title="Continue Watching" channels={history.slice(0, 10)} />
        )}
        
        {/* Favorites Row (if exists) */}
        {favorites.length > 0 && selectedCategory === "All" && selectedCountry === "All" && (
          <ChannelRow title="Your Favorites" channels={channels.filter(c => favorites.includes(c.id)).slice(0, 10)} />
        )}

        {/* Grouped Category Rows */}
        {Object.entries(groupedChannels).map(([group, groupChannels]) => (
          <ChannelRow key={group} title={group} channels={groupChannels} />
        ))}
        
        {channels.length === 0 && !loading && (
          <div className="text-center py-20">
            <h3 className="text-2xl text-zinc-500">No channels found.</h3>
            <p className="text-zinc-600 mt-2">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
