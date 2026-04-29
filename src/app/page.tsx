'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Channel } from '@/lib/m3uParser';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import HeroPlayer from '@/components/ui/HeroPlayer';
import ChannelRow from '@/components/ui/ChannelRow';
import { Search, Loader2 } from 'lucide-react';

export default function Home() {
  // Initialize spatial navigation for Smart TVs
  useSpatialNavigation();

  const { allChannels: channels, isLoadingChannels: loading, loadChannels, history, favorites, currentChannel } = useStore();
  const [customUrl, setCustomUrl] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    // Load saved custom URL if exists
    const savedUrl = localStorage.getItem('htv-custom-m3u');
    if (savedUrl) {
      setCustomUrl(savedUrl);
      loadChannels([savedUrl]);
    } else {
      loadChannels();
    }
  }, [loadChannels]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl) {
      localStorage.setItem('htv-custom-m3u', customUrl);
    } else {
      localStorage.removeItem('htv-custom-m3u');
    }
    window.location.reload();
  };

  // Extract unique filter options
  const uniqueCountries = useMemo(() => Array.from(new Set(channels.map(c => c.country))).filter(Boolean).sort(), [channels]);
  const uniqueCategories = useMemo(() => Array.from(new Set(channels.map(c => c.group))).filter(Boolean).sort(), [channels]);

  // Filter channels before grouping
  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchCountry = selectedCountry === "All" || c.country === selectedCountry;
      const matchCategory = selectedCategory === "All" || c.group === selectedCategory;
      return matchCountry && matchCategory;
    });
  }, [channels, selectedCountry, selectedCategory]);

  // Group channels for rows
  const groupedChannels = useMemo(() => {
    const groups: Record<string, Channel[]> = {};
    filteredChannels.forEach(c => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, [filteredChannels]);

  // Determine Hero Channel
  const heroChannel = currentChannel || (history.length > 0 ? history[0] : channels[heroIndex]);

  const handleHeroStreamError = () => {
    // If we're showing a channel from the main list (not history, not currentChannel)
    if (!currentChannel && history.length === 0 && heroIndex < channels.length - 1) {
      console.log(`Hero channel stream failed. Skipping to next channel (index ${heroIndex + 1})`);
      setHeroIndex(heroIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {heroChannel && <HeroPlayer channel={heroChannel} onStreamError={handleHeroStreamError} />}

      <div className="px-12 -mt-16 relative z-30 mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <form onSubmit={handleUrlSubmit} className="flex flex-1 max-w-xl bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 focus-within:ring-2 focus-within:ring-red-600">
            <div className="flex-1 flex items-center px-4">
              <Search className="text-zinc-400 mr-2" size={20} />
              <input 
                type="text" 
                placeholder="Paste custom M3U URL or leave empty for default..." 
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full bg-transparent text-white py-3 focus:outline-none"
                tabIndex={0}
              />
            </div>
            <button type="submit" tabIndex={0} className="bg-red-600 text-white px-6 font-bold hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-400 transition-colors">
              Load
            </button>
          </form>
          <div className="bg-zinc-800/80 backdrop-blur border border-zinc-700 text-zinc-300 px-4 py-3 rounded-lg font-medium text-sm">
            Total Channels: <span className="text-white font-bold">{channels.length.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="px-12 relative z-30 mb-8 flex space-x-4">
        <select 
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="bg-zinc-900 text-white border border-zinc-800 rounded px-4 py-2 focus:ring-2 focus:ring-red-600 focus:outline-none"
        >
          <option value="All">All Countries</option>
          {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-zinc-900 text-white border border-zinc-800 rounded px-4 py-2 focus:ring-2 focus:ring-red-600 focus:outline-none"
        >
          <option value="All">All Categories</option>
          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {history.length > 0 && (
          <ChannelRow title="Continue Watching" channels={history} />
        )}

        {favorites.length > 0 && (
          <ChannelRow 
            title="Your Favorites" 
            channels={channels.filter(c => favorites.includes(c.id))} 
          />
        )}

        {/* Render top 10 categories to avoid overwhelming the DOM initially, in a real app use react-virtual */}
        {Object.entries(groupedChannels)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 10)
          .map(([groupName, groupChannels]) => (
            <ChannelRow key={groupName} title={groupName} channels={groupChannels} />
          ))
        }
      </div>
    </div>
  );
}
