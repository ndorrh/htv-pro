'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Channel } from '@/lib/m3uParser';
import HlsPlayer from '@/components/player/HlsPlayer';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { Plus, X, AlertTriangle, Volume2 } from 'lucide-react';

function MultiViewContent() {
  useSpatialNavigation();
  const searchParams = useSearchParams();
  
  const { multiViewChannels, setMultiViewChannel, focusedPlayerIndex, setFocusedPlayerIndex, allChannels: channels, loadChannels } = useStore();
  const [showWarning, setShowWarning] = useState(true);
  
  const processedAddId = useRef<string | null>(null);

  // Selection UI state
  const [selectingForSlot, setSelectingForSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const activeUrl = localStorage.getItem('htv-custom-m3u');
    if (activeUrl) {
      loadChannels([activeUrl]);
    } else {
      loadChannels();
    }
  }, [loadChannels]);

  useEffect(() => {
    const addId = searchParams.get('add');
    if (!addId) {
      processedAddId.current = null;
      return;
    }

    if (addId && channels.length > 0 && processedAddId.current !== addId) {
      processedAddId.current = addId;
      const channel = channels.find(c => c.id === addId);
      if (channel) {
        // Find first empty slot
        const emptyIndex = multiViewChannels.findIndex(c => c === null);
        if (emptyIndex !== -1) {
          setMultiViewChannel(emptyIndex, channel);
          setFocusedPlayerIndex(emptyIndex);
        }
      }
      // Clear URL params without triggering a Next.js navigation
      window.history.replaceState(null, '', '/multiview');
    }
  }, [searchParams, channels, multiViewChannels, setMultiViewChannel, setFocusedPlayerIndex]);

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

  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50);
  
  const activeSlots = multiViewChannels.map((c, i) => ({ channel: c, index: i })).filter(s => s.channel !== null);
  const activeCount = activeSlots.length;

  // Determine grid layout based on active channels
  let gridCols = "grid-cols-1";
  if (activeCount > 1) gridCols = "grid-cols-2";
  
  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col relative pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Multi-View Grid</h1>
        
        {showWarning && (
          <div className="flex items-center bg-amber-900/40 border border-amber-600 text-amber-200 px-4 py-2 rounded-lg ml-4 flex-1 max-w-3xl">
            <AlertTriangle className="mr-2 shrink-0" size={20} />
            <p className="text-sm">
              <strong>Hardware Warning:</strong> Playing multiple streams simultaneously may cause low-end Smart TVs to crash. Use at your own risk. Defaulting to adaptive bitrate.
            </p>
            <button tabIndex={0} onClick={() => setShowWarning(false)} className="ml-4 p-1 hover:bg-amber-800 rounded focus:ring-2 focus:ring-amber-500">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {activeCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl p-12">
          <div className="bg-zinc-900 p-6 rounded-full mb-6">
            <Plus size={48} className="text-zinc-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Build Your Grid</h2>
          <p className="mb-8">Add up to 4 streams to watch simultaneously.</p>
          <button 
            tabIndex={0}
            onClick={handleAddScreen}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg focus:ring-4 focus:ring-red-400 focus:outline-none transition-all scale-105 hover:scale-110"
          >
            Add First Screen
          </button>
        </div>
      ) : (
        <div className={`flex-1 grid ${gridCols} gap-4 h-full`}>
          {activeSlots.map(({ channel, index }) => {
            const isFocused = focusedPlayerIndex === index;

            return (
              <div 
                key={`slot-${index}`}
                tabIndex={0}
                onClick={() => setFocusedPlayerIndex(index)}
                onKeyDown={(e) => e.key === 'Enter' && setFocusedPlayerIndex(index)}
                className={`relative rounded-xl overflow-hidden bg-black focus:outline-none transition-all ${isFocused ? 'ring-4 ring-red-600 shadow-2xl shadow-red-900/50 scale-[1.01] z-10' : 'ring-1 ring-zinc-800 opacity-80 hover:opacity-100 cursor-pointer'} ${activeCount === 1 ? 'aspect-video w-full max-w-5xl mx-auto' : 'h-full min-h-[300px]'}`}
              >
                <HlsPlayer 
                  src={channel!.sources[0]?.url} 
                  autoPlay={true}
                  muted={!isFocused} 
                  isMini={false}
                  onChangeChannel={() => setSelectingForSlot(index)}
                  className="w-full h-full absolute inset-0"
                />
                
                <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 rounded border border-zinc-800 flex items-center z-20 pointer-events-none">
                  <span className="text-white font-medium text-sm">{channel!.name}</span>
                  {isFocused && <Volume2 size={16} className="text-red-500 ml-2" />}
                </div>

                <button
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChannel(index);
                  }}
                  className="absolute top-4 right-4 bg-black/80 p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:bg-red-600 focus:ring-2 focus:ring-white transition-colors z-20"
                  title="Remove Screen"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Add Screen Button */}
      {activeCount > 0 && activeCount < 4 && (
        <button
          tabIndex={0}
          onClick={handleAddScreen}
          className="fixed bottom-8 right-8 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl focus:ring-4 focus:ring-red-400 focus:outline-none transition-all hover:scale-110 z-30 flex items-center space-x-2"
        >
          <Plus size={24} />
          <span className="font-bold pr-2">Add Screen</span>
        </button>
      )}

      {/* Selection Modal */}
      {selectingForSlot !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 md:p-12">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Select Channel</h2>
              <button onClick={() => setSelectingForSlot(null)} className="p-2 bg-zinc-900 rounded hover:bg-zinc-800 text-white">
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

export default function MultiViewPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>}>
      <MultiViewContent />
    </Suspense>
  );
}
