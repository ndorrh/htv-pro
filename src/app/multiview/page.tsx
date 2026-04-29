'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ChannelData as Channel } from '@/lib/iptvApi';
import HlsPlayer from '@/components/player/HlsPlayer';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { Plus, X, AlertTriangle, Volume2, Search as SearchIcon, Loader2 } from 'lucide-react';

function MultiViewContent() {
  useSpatialNavigation();
  const searchParams = useSearchParams();
  
  const { multiViewChannels, setMultiViewChannel, focusedPlayerIndex, setFocusedPlayerIndex } = useStore();
  const [showWarning, setShowWarning] = useState(true);
  
  const processedAddId = useRef<string | null>(null);

  // Selection UI state
  const [selectingForSlot, setSelectingForSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [searching, setSearching] = useState(false);

  // Handle ?add=id in URL
  useEffect(() => {
    const addId = searchParams.get('add');
    if (!addId) {
      processedAddId.current = null;
      return;
    }

    if (addId && processedAddId.current !== addId) {
      processedAddId.current = addId;
      
      // Fetch channel by ID
      fetch(`/api/channels/${addId}`)
        .then(res => res.ok ? res.json() : null)
        .then(channel => {
          if (channel && channel.id) {
            const emptyIndex = multiViewChannels.findIndex(c => c === null);
            if (emptyIndex !== -1) {
              setMultiViewChannel(emptyIndex, channel);
              setFocusedPlayerIndex(emptyIndex);
            }
          }
          window.history.replaceState(null, '', '/multiview');
        })
        .catch(err => console.error("Failed to add channel", err));
    }
  }, [searchParams, multiViewChannels, setMultiViewChannel, setFocusedPlayerIndex]);

  // Search when typing in modal
  useEffect(() => {
    if (selectingForSlot === null) return;
    
    if (!searchQuery.trim()) {
      // Load some defaults
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
  }, [searchQuery, selectingForSlot]);

  const handleSelectChannel = (channel: Channel) => {
    if (selectingForSlot !== null) {
      setMultiViewChannel(selectingForSlot, channel);
      setFocusedPlayerIndex(selectingForSlot);
      setSelectingForSlot(null);
      setSearchQuery("");
    }
  };

  const removeChannel = (index: number) => {
    setMultiViewChannel(index, null);
  };

  const handleAddScreen = () => {
    const emptyIndex = multiViewChannels.findIndex(c => c === null);
    if (emptyIndex !== -1) {
      setSelectingForSlot(emptyIndex);
    }
  };

  const activeSlots = multiViewChannels.map((c, i) => ({ channel: c, index: i })).filter(s => s.channel !== null);
  const activeCount = activeSlots.length;

  let gridCols = 'grid-cols-1';
  let gridRows = 'grid-rows-1';
  if (activeCount === 2) {
    gridCols = 'grid-cols-2';
    gridRows = 'grid-rows-1';
  } else if (activeCount > 2) {
    gridCols = 'grid-cols-2';
    gridRows = 'grid-rows-2';
  }

  return (
    <div className="h-screen bg-black flex flex-col relative">
      {/* Disclaimer Warning */}
      {showWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-900/90 border border-yellow-700 text-yellow-100 px-6 py-3 rounded-lg shadow-2xl flex items-center space-x-4 max-w-2xl">
          <AlertTriangle className="text-yellow-400 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Hardware Performance Warning</p>
            <p>Playing multiple video streams simultaneously requires significant network bandwidth and hardware decoding capabilities. You may experience buffering or degraded quality.</p>
          </div>
          <button onClick={() => setShowWarning(false)} className="text-yellow-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className={`flex-1 grid ${gridCols} ${gridRows} gap-1 p-1 bg-zinc-950`}>
        {multiViewChannels.map((channel, i) => {
          if (!channel) return null;
          
          const isFocused = focusedPlayerIndex === i;
          
          return (
            <div 
              key={`slot-${i}`} 
              className={`relative bg-zinc-900 rounded-sm overflow-hidden border-2 transition-colors ${isFocused ? 'border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] z-10' : 'border-transparent'}`}
              onClick={() => setFocusedPlayerIndex(i)}
            >
              <HlsPlayer 
                src={channel.streams[0]?.url || ''} 
                autoPlay={true}
                muted={!isFocused} 
                className="w-full h-full object-contain bg-black"
              />
              
              {/* Overlay UI */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex items-center space-x-2">
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">LIVE</span>
                  <span className="text-white font-semibold drop-shadow-md">{channel.name}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChannel(i);
                  }}
                  className="bg-black/50 text-white hover:bg-red-600 p-1.5 rounded transition-colors"
                  title="Remove Screen"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Audio Indicator */}
              {isFocused && (
                <div className="absolute bottom-4 right-4 bg-red-600/90 text-white px-2 py-1 rounded flex items-center space-x-1 shadow-lg backdrop-blur-sm">
                  <Volume2 size={14} />
                  <span className="text-xs font-bold">Audio Active</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Screen Button (if less than 4) */}
        {activeCount < 4 && !selectingForSlot && (
          <div 
            onClick={handleAddScreen}
            className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/30 rounded flex flex-col items-center justify-center cursor-pointer transition-colors group text-zinc-500 hover:text-zinc-300"
          >
            <Plus size={48} className="mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Add Channel to View</span>
            <span className="text-xs text-zinc-600 mt-1">{4 - activeCount} slots remaining</span>
          </div>
        )}
      </div>

      {/* Channel Selection Modal */}
      {selectingForSlot !== null && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl max-h-full rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h2 className="text-2xl font-bold text-white">Select Channel for Screen {selectingForSlot + 1}</h2>
              <button 
                onClick={() => setSelectingForSlot(null)}
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

export default function MultiViewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    }>
      <MultiViewContent />
    </Suspense>
  );
}
