import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChannelData as Channel } from '@/lib/iptvApi';

interface StoreState {
  favorites: string[];
  history: Channel[];
  currentChannel: Channel | null;
  isMiniMode: boolean; // true = show mini player, false = went to full player page
  multiViewChannels: (Channel | null)[]; // Fixed length 4 array
  focusedPlayerIndex: number;
  
  // Actions
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  
  addToHistory: (channel: Channel) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  // Activates PiP/mini player mode explicitly
  setMiniMode: (active: boolean) => void;
  
  setMultiViewChannel: (index: number, channel: Channel | null) => void;
  setFocusedPlayerIndex: (index: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],
      currentChannel: null,
      isMiniMode: false,
      multiViewChannels: [null, null, null, null],
      focusedPlayerIndex: 0,

      addFavorite: (id) => set((state) => ({ favorites: [...new Set([...state.favorites, id])] })),
      removeFavorite: (id) => set((state) => ({ favorites: state.favorites.filter((fId) => fId !== id) })),
      toggleFavorite: (id) => {
        const isFav = get().favorites.includes(id);
        if (isFav) {
          get().removeFavorite(id);
        } else {
          get().addFavorite(id);
        }
      },
      isFavorite: (id) => get().favorites.includes(id),

      addToHistory: (channel) => set((state) => {
        const filteredHistory = state.history.filter(c => c.id !== channel.id);
        const newHistory = [channel, ...filteredHistory].slice(0, 50); // Keep last 50
        return { history: newHistory };
      }),

      // Normal play: set channel but NOT mini mode — caller navigates to /player
      setCurrentChannel: (channel) => set({ currentChannel: channel }),

      // Explicitly activate PiP mini player
      setMiniMode: (active) => set({ isMiniMode: active }),

      setMultiViewChannel: (index, channel) => set((state) => {
        const newMultiView = [...state.multiViewChannels];
        newMultiView[index] = channel;
        return { multiViewChannels: newMultiView };
      }),

      setFocusedPlayerIndex: (index) => set({ focusedPlayerIndex: index }),
    }),
    {
      name: 'htv-pro-storage',
      partialize: (state) => ({ 
        favorites: state.favorites, 
        history: state.history,
        currentChannel: state.currentChannel,
        isMiniMode: state.isMiniMode,
      }),
    }
  )
);
