'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Channel, fetchAndParseM3U } from '@/lib/m3uParser';
import HlsPlayer from '@/components/player/HlsPlayer';
import { ArrowLeft, Heart, X } from 'lucide-react';
import { useSpatialNavigation } from '@/lib/spatialFocus';

const DEFAULT_M3U = "https://iptv-org.github.io/iptv/index.m3u";

export default function PlayerPage() {
  useSpatialNavigation();
  const router = useRouter();
  const { currentChannel, isFavorite, toggleFavorite, setCurrentChannel } = useStore();
  const [sourceIndex, setSourceIndex] = useState(0);

  // Selection Modal State
  const [isSelectingChannel, setIsSelectingChannel] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!currentChannel) {
      router.push('/');
    }
  }, [currentChannel, router]);

  useEffect(() => {
    if (isSelectingChannel && channels.length === 0) {
      const activeUrl = localStorage.getItem('htv-custom-m3u') || DEFAULT_M3U;
      fetchAndParseM3U(activeUrl).then(setChannels);
    }
  }, [isSelectingChannel, channels.length]);

  if (!currentChannel) return null;

  const streamSrc = currentChannel.sources[sourceIndex]?.url;
  const favorite = isFavorite(currentChannel.id);

  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50);

  const handleSelectChannel = (channel: Channel) => {
    setCurrentChannel(channel);
    setSourceIndex(0);
    setIsSelectingChannel(false);
    setSearchQuery("");
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
            <p className="text-sm text-zinc-400">{currentChannel.group}</p>
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

      <div className="flex-1 w-full h-full">
        {streamSrc ? (
          <HlsPlayer 
            src={streamSrc} 
            autoPlay={true} 
            muted={false} 
            className="w-full h-full"
            onChangeChannel={() => setIsSelectingChannel(true)}
            onStreamError={() => {
              if (sourceIndex + 1 < currentChannel.sources.length) {
                console.log(`Stream failed. Auto-switching to alternative source ${sourceIndex + 1}...`);
                setSourceIndex(sourceIndex + 1);
              } else {
                console.error("All available streams for this channel have failed.");
              }
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white">
            <p>No valid stream found for this channel.</p>
          </div>
        )}
      </div>

      {/* Selection Modal */}
      {isSelectingChannel && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 md:p-12">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Select Channel</h2>
              <button onClick={() => setIsSelectingChannel(false)} className="p-2 bg-zinc-900 rounded hover:bg-zinc-800 text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
              <input 
                type="text" 
                autoFocus
                placeholder="Search channels..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-4 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 mb-6"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-10">
                {filteredChannels.map(channel => (
                  <button
                    key={channel.id}
                    tabIndex={0}
                    onClick={() => handleSelectChannel(channel)}
                    className="flex flex-col items-center p-4 bg-zinc-900 rounded-lg hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-left border border-transparent hover:border-zinc-700 transition-colors"
                  >
                    {channel.logo ? (
                      <img src={channel.logo} alt={channel.name} className="h-12 w-auto mb-3 object-contain" />
                    ) : (
                      <div className="h-12 w-full bg-zinc-800 mb-3 rounded flex items-center justify-center text-zinc-500 font-bold text-xs">NO LOGO</div>
                    )}
                    <span className="text-sm font-medium text-white truncate w-full text-center">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
