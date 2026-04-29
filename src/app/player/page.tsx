'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ChannelData as Channel } from '@/lib/iptvApi';
import HlsPlayer from '@/components/player/HlsPlayer';
import { ArrowLeft, Heart, X, Search as SearchIcon, Loader2 } from 'lucide-react';
import { useSpatialNavigation } from '@/lib/spatialFocus';

export default function PlayerPage() {
  useSpatialNavigation();
  const router = useRouter();
  const { currentChannel, isFavorite, toggleFavorite, setCurrentChannel } = useStore();
  const [sourceIndex, setSourceIndex] = useState(0);

  // Selection Modal State
  const [isSelectingChannel, setIsSelectingChannel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!currentChannel) {
      router.push('/');
    }
  }, [currentChannel, router]);

  // Search when typing in modal
  useEffect(() => {
    if (!isSelectingChannel) return;
    
    if (!searchQuery.trim()) {
      setSearching(true);
      fetch('/api/channels?limit=20')
        .then(res => res.json())
        .then(data => setSearchResults(data.data || []))
        .finally(() => setSearching(false));
      return;
    }

    const timeout = setTimeout(() => {
      setSearching(true);
      fetch(`/api/channels?search=${encodeURIComponent(searchQuery)}&limit=50`)
        .then(res => res.json())
        .then(data => setSearchResults(data.data || []))
        .finally(() => setSearching(false));
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery, isSelectingChannel]);

  if (!currentChannel) return null;

  const streamSrc = currentChannel.streams?.[sourceIndex]?.url;
  const favorite = isFavorite(currentChannel.id);

  const handleSelectChannel = (channel: Channel) => {
    setCurrentChannel(channel);
    setSourceIndex(0);
    setIsSelectingChannel(false);
    setSearchQuery("");
  };

  const handleStreamError = () => {
    if (sourceIndex < currentChannel.streams.length - 1) {
      setSourceIndex(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none">
        <button 
          tabIndex={0}
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-white hover:text-red-500 focus:outline-none focus:ring-4 focus:ring-red-600 rounded-lg p-2 pointer-events-auto"
        >
          <ArrowLeft size={24} />
          <span className="text-lg font-medium">Back to Browse</span>
        </button>

        <div className="flex items-center space-x-4 pointer-events-auto">
          <div className="text-right">
            <h2 className="text-xl font-bold text-white">{currentChannel.name}</h2>
            <p className="text-sm text-zinc-400">{currentChannel.categories?.[0] || 'Uncategorized'}</p>
          </div>
          <button 
            tabIndex={0}
            onClick={() => toggleFavorite(currentChannel.id)}
            className={`p-3 rounded-full focus:outline-none focus:ring-4 focus:ring-red-600 transition-colors ${favorite ? 'text-red-500 bg-red-500/20' : 'text-white hover:text-red-500 bg-zinc-800/80 hover:bg-zinc-800'}`}
          >
            <Heart size={24} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Main Player Area */}
      <div className="flex-1 relative">
        {streamSrc ? (
          <HlsPlayer 
            src={streamSrc} 
            autoPlay={true} 
            controls={true}
            className="w-full h-full"
            onStreamError={handleStreamError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 flex-col">
            <span className="text-2xl font-bold mb-2">Stream Offline</span>
            <span>No working sources available for this channel</span>
          </div>
        )}
      </div>

      {/* Bottom Bar Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-center justify-center opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="flex space-x-4 pointer-events-auto">
          <button
            onClick={() => setIsSelectingChannel(true)}
            className="px-6 py-2 bg-zinc-800/80 text-white rounded font-medium hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-600 backdrop-blur"
          >
            Change Channel
          </button>
          <button
            onClick={() => router.push(`/multiview?add=${encodeURIComponent(currentChannel.id)}`)}
            className="px-6 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Open in Multi-View
          </button>
        </div>
      </div>

      {/* Channel Selection Modal */}
      {isSelectingChannel && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-8 pointer-events-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl max-h-full rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h2 className="text-2xl font-bold text-white">Change Channel</h2>
              <button 
                onClick={() => setIsSelectingChannel(false)}
                className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 border-b border-zinc-800 bg-zinc-950">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {searching ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-red-600" size={32} /></div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">No channels found</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {searchResults.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => handleSelectChannel(channel)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-zinc-800 text-left group transition-colors focus:outline-none focus:bg-zinc-800 focus:ring-2 focus:ring-red-600"
                    >
                      <div className="w-12 h-12 bg-zinc-950 rounded flex items-center justify-center shrink-0 p-1">
                        {channel.logo ? (
                          <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-xs text-zinc-600 font-bold">{channel.name.slice(0,2)}</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-white font-medium truncate group-hover:text-red-400">{channel.name}</div>
                        <div className="text-zinc-500 text-xs truncate">{channel.categories?.[0] || 'Uncategorized'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
