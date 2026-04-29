'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { Loader2, Tv } from 'lucide-react';
import { ChannelData as Channel } from '@/lib/iptvApi';

const LIMIT = 40;

export default function AllChannelsPage() {
  useSpatialNavigation();

  const [categories, setCategories] = useState<any[]>([]);
  const [countries, setCountries]   = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry,  setSelectedCountry]  = useState('All');

  const [channels, setChannels]               = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [hasMore, setHasMore]                 = useState(true);

  // Stable refs so IntersectionObserver never reads stale closure values
  const pageRef             = useRef(1);
  const loadingRef          = useRef(false);
  const hasMoreRef          = useRef(true);
  const categoryRef         = useRef('All');
  const countryRef          = useRef('All');
  const observerTarget      = useRef<HTMLDivElement>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  async function doFetch(pageNum: number, append: boolean) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingChannels(true);
    try {
      const params = new URLSearchParams();
      if (categoryRef.current !== 'All') params.append('category', categoryRef.current);
      if (countryRef.current  !== 'All') params.append('country',  countryRef.current);
      params.append('page',  pageNum.toString());
      params.append('limit', LIMIT.toString());

      const res = await fetch(`/api/channels?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      const fetched: Channel[] = data.data || [];
      setChannels(prev => append ? [...prev, ...fetched] : fetched);

      const more = fetched.length === LIMIT;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (err) {
      console.error('Channel fetch failed', err);
    } finally {
      loadingRef.current = false;
      setLoadingChannels(false);
    }
  }

  // ── metadata ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetch('/api/categories'), fetch('/api/countries')])
      .then(async ([catRes, countryRes]) => {
        if (catRes.ok)     setCategories(await catRes.json());
        if (countryRes.ok) setCountries(await countryRes.json());
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false));
  }, []);

  // ── reset when filter changes ──────────────────────────────────────────────
  useEffect(() => {
    categoryRef.current = selectedCategory;
    countryRef.current  = selectedCountry;
    pageRef.current     = 1;
    hasMoreRef.current  = true;
    doFetch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCountry]);

  // ── infinite scroll (created once, refs stay fresh) ───────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
        const next = pageRef.current + 1;
        pageRef.current = next;
        doFetch(next, true);
      }
    }, { threshold: 0.1 });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── pill styles ────────────────────────────────────────────────────────────
  const pillBase =
    'shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-200 ' +
    'focus:outline-none focus:ring-4 focus:ring-red-600/50 cursor-pointer select-none whitespace-nowrap';
  const active   = 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-700/30 scale-105';
  const inactive = 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-400 hover:text-white hover:bg-zinc-800';

  if (loadingMeta) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

  return (
    <>
      {/* ── Sticky filter header (sits inside <main> which handles scroll) ─── */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/70 pt-8 pb-5 space-y-5">
        {/* Title row */}
        <div className="px-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600/10 rounded-xl">
              <Tv className="text-red-500" size={26} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Browse Channels</h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                {channels.length > 0
                  ? `${channels.length}${hasMore ? '+' : ''} channels`
                  : loadingChannels ? 'Loading…' : 'No channels found'}
              </p>
            </div>
          </div>
        </div>

        {/* Row 1 — Categories */}
        <div>
          <p className="px-10 mb-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            Category
          </p>
          <div
            className="flex gap-2.5 overflow-x-auto px-10 pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            <button tabIndex={0} onClick={() => setSelectedCategory('All')}
              className={`${pillBase} ${selectedCategory === 'All' ? active : inactive}`}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat.id} tabIndex={0} onClick={() => setSelectedCategory(cat.id)}
                className={`${pillBase} ${selectedCategory === cat.id ? active : inactive}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2 — Countries */}
        <div>
          <p className="px-10 mb-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            Region
          </p>
          <div
            className="flex gap-2.5 overflow-x-auto px-10 pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            <button tabIndex={0} onClick={() => setSelectedCountry('All')}
              className={`${pillBase} ${selectedCountry === 'All' ? active : inactive}`}>
              🌍 All
            </button>
            {countries.map(c => (
              <button key={c.code} tabIndex={0} onClick={() => setSelectedCountry(c.code)}
                className={`${pillBase} ${selectedCountry === c.code ? active : inactive}`}>
                {c.flag && <span className="mr-1">{c.flag}</span>}{c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Channel grid (scroll is handled by parent <main>) ─────────────── */}
      <div className="px-10 pt-8 pb-36">
        {channels.length === 0 && !loadingChannels ? (
          <div className="flex flex-col items-center justify-center py-40 text-zinc-600">
            <Tv size={72} className="mb-5 opacity-20" />
            <p className="text-2xl font-semibold text-zinc-500">No channels found</p>
            <p className="text-zinc-600 mt-2 text-sm">Try a different category or region.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
            {channels.map((channel, i) => (
              <ChannelCard key={`${channel.id}-${i}`} channel={channel} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerTarget} className="w-full py-12 flex flex-col items-center gap-2">
          {loadingChannels && (
            <>
              <Loader2 className="animate-spin text-red-600" size={28} />
              <span className="text-zinc-500 text-sm">Loading more channels…</span>
            </>
          )}
          {!hasMore && channels.length > 0 && !loadingChannels && (
            <p className="text-zinc-600 text-xs uppercase tracking-widest">— end of results —</p>
          )}
        </div>
      </div>
    </>
  );
}
