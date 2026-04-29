// Core service for fetching and caching IPTV API data.

export interface ApiChannel {
  id: string;
  name: string;
  alt_names: string[];
  network: string | null;
  owners: string[];
  country: string;
  categories: string[];
  is_nsfw: boolean;
  launched: string | null;
  closed: string | null;
  replaced_by: string | null;
  website: string | null;
}

export interface ApiStream {
  channel: string | null;
  feed: string | null;
  title: string;
  url: string;
  referrer: string | null;
  user_agent: string | null;
  quality: string | null;
  label: string | null;
}

export interface ApiCategory {
  id: string;
  name: string;
  description: string;
}

export interface ApiCountry {
  name: string;
  code: string;
  languages: string[];
  flag: string;
}

export interface ApiLanguage {
  name: string;
  code: string;
}

export interface ApiRegion {
  code: string;
  name: string;
  countries: string[];
}

export interface ApiCity {
  country: string;
  subdivision: string | null;
  name: string;
  code: string;
  wikidata_id: string;
}

export interface ApiSubdivision {
  country: string;
  name: string;
  code: string;
  parent: string | null;
}

export interface ApiTimezone {
  id: string;
  utc_offset: string;
  countries: string[];
}

export interface ApiLogo {
  channel: string;
  feed: string | null;
  in_use: boolean;
  tags: string[];
  width: number;
  height: number;
  format: string | null;
  url: string;
}

export interface ApiBlocklist {
  channel: string;
  reason: string;
  ref: string;
}

export interface ApiGuide {
  channel: string | null;
  feed: string | null;
  site: string;
  site_id: string;
  site_name: string;
  lang: string;
}

export interface ApiFeed {
  channel: string;
  id: string;
  name: string;
  alt_names: string[];
  is_main: boolean;
  broadcast_area: string[];
  timezones: string[];
  languages: string[];
  format: string;
}

// Composite interface for frontend
export interface ChannelData {
  id: string;
  name: string;
  alt_names: string[];
  country: string | null;
  categories: string[];
  logo: string | null;
  streams: ApiStream[];
  is_nsfw: boolean;
}

interface Cache {
  channels: ApiChannel[];
  streams: ApiStream[];
  categories: ApiCategory[];
  countries: ApiCountry[];
  languages: ApiLanguage[];
  regions: ApiRegion[];
  cities: ApiCity[];
  subdivisions: ApiSubdivision[];
  timezones: ApiTimezone[];
  logos: ApiLogo[];
  blocklist: ApiBlocklist[];
  guides: ApiGuide[];
  feeds: ApiFeed[];
  lastFetched: number;
}

const cache: Cache = {
  channels: [],
  streams: [],
  categories: [],
  countries: [],
  languages: [],
  regions: [],
  cities: [],
  subdivisions: [],
  timezones: [],
  logos: [],
  blocklist: [],
  guides: [],
  feeds: [],
  lastFetched: 0,
};

const BASE_URL = 'https://iptv-org.github.io/api';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchJson<T>(endpoint: string, retries = 5, baseDelay = 1000): Promise<T[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per request
      
      const res = await fetch(`${BASE_URL}/${endpoint}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error: any) {
      console.warn(`[API] Attempt ${attempt}/${retries} failed for ${endpoint}: ${error.message}`);
      if (attempt === retries) {
        console.error(`[API] All ${retries} attempts failed for ${endpoint}. Returning empty array.`);
        return [];
      }
      // Exponential backoff: 1s, 2s, 4s, 8s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return [];
}

// Singleton: if a refresh is already underway, all callers await the same promise.
// This prevents the race condition where 3 API routes start fetching simultaneously.
let _refreshInFlight: Promise<void> | null = null;

export async function refreshCache(): Promise<void> {
  const now = Date.now();

  // Cache still fresh — skip entirely
  if (now - cache.lastFetched < CACHE_TTL && cache.channels.length > 0) {
    console.log(`[Cache] Using cached data (fresh for another ${Math.round((CACHE_TTL - (now - cache.lastFetched)) / 60000)}m)`);
    return;
  }

  // Another caller already started a fetch — wait for it to finish instead of starting a new one
  if (_refreshInFlight) {
    return _refreshInFlight;
  }

  // We are the first caller — start the fetch and store the promise
  _refreshInFlight = (async () => {
    // Double-check after acquiring "lock" (another await may have completed between the checks above)
    const now2 = Date.now();
    if (now2 - cache.lastFetched < CACHE_TTL && cache.channels.length > 0) {
      return;
    }

    console.log('[Cache] Fetching fresh data from iptv-org API...');

    const [
      channels, streams, categories, countries, languages,
      regions, cities, subdivisions, timezones, logos,
      blocklist, guides, feeds
    ] = await Promise.all([
      fetchJson<ApiChannel>('channels.json'),
      fetchJson<ApiStream>('streams.json'),
      fetchJson<ApiCategory>('categories.json'),
      fetchJson<ApiCountry>('countries.json'),
      fetchJson<ApiLanguage>('languages.json'),
      fetchJson<ApiRegion>('regions.json'),
      fetchJson<ApiCity>('cities.json'),
      fetchJson<ApiSubdivision>('subdivisions.json'),
      fetchJson<ApiTimezone>('timezones.json'),
      fetchJson<ApiLogo>('logos.json'),
      fetchJson<ApiBlocklist>('blocklist.json'),
      fetchJson<ApiGuide>('guides.json'),
      fetchJson<ApiFeed>('feeds.json'),
    ]);

    cache.channels     = channels;
    cache.streams      = streams;
    cache.categories   = categories;
    cache.countries    = countries;
    cache.languages    = languages;
    cache.regions      = regions;
    cache.cities       = cities;
    cache.subdivisions = subdivisions;
    cache.timezones    = timezones;
    cache.logos        = logos;
    cache.blocklist    = blocklist;
    cache.guides       = guides;
    cache.feeds        = feeds;
    cache.lastFetched  = Date.now();

    console.log(`[Cache] Ready — ${channels.length} channels, ${streams.length} streams.`);
  })().finally(() => {
    // Always clear the in-flight reference so future refreshes can run after TTL expires
    _refreshInFlight = null;
  });

  return _refreshInFlight;
}

export async function getCategories() {
  await refreshCache();
  return cache.categories;
}

export async function getCountries() {
  await refreshCache();
  return cache.countries;
}

export async function getLanguages() {
  await refreshCache();
  return cache.languages;
}

export async function getRegions() {
  await refreshCache();
  return cache.regions;
}

export async function getCities() {
  await refreshCache();
  return cache.cities;
}

export async function getSubdivisions() {
  await refreshCache();
  return cache.subdivisions;
}

export async function getTimezones() {
  await refreshCache();
  return cache.timezones;
}

export async function getGuides() {
  await refreshCache();
  return cache.guides;
}

export async function getBlocklist() {
  await refreshCache();
  return cache.blocklist;
}

export async function getFeeds() {
  await refreshCache();
  return cache.feeds;
}

export async function getChannels(params: {
  category?: string;
  country?: string;
  language?: string;
  region?: string;
  search?: string;
  page?: number;
  limit?: number;
  ids?: string[];
}) {
  await refreshCache();

  let filtered = cache.channels;

  // Filter blocked channels
  const blockedIds = new Set(cache.blocklist.map(b => b.channel));
  filtered = filtered.filter(c => !blockedIds.has(c.id));

  if (params.ids && params.ids.length > 0) {
    const idSet = new Set(params.ids);
    filtered = filtered.filter(c => idSet.has(c.id));
  } else {
    if (params.category) {
      filtered = filtered.filter(c => c.categories.includes(params.category!));
    }

    if (params.country) {
      filtered = filtered.filter(c => c.country === params.country);
    }

    if (params.language) {
      // Channels don't have direct language, but we can filter by matching feeds which have languages
      const feedsWithLanguage = new Set(cache.feeds.filter(f => f.languages.includes(params.language!)).map(f => f.channel));
      filtered = filtered.filter(c => feedsWithLanguage.has(c.id));
    }

    if (params.region) {
      // Find countries in the region, then filter channels by those countries
      const region = cache.regions.find(r => r.code === params.region);
      if (region) {
        filtered = filtered.filter(c => region.countries.includes(c.country));
      }
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.alt_names.some(alt => alt.toLowerCase().includes(q))
      );
    }
  }

  // Pagination
  const limit = params.limit || 50;
  const page = params.page || 1;
  const total = filtered.length;
  
  const start = (page - 1) * limit;
  const sliced = filtered.slice(start, start + limit);

  // Map to composite objects (joining streams and logos)
  // Optimization: Group streams and logos by channel ID
  const streamsByChannel = new Map<string, ApiStream[]>();
  cache.streams.forEach(s => {
    if (s.channel) {
      if (!streamsByChannel.has(s.channel)) streamsByChannel.set(s.channel, []);
      streamsByChannel.get(s.channel)!.push(s);
    }
  });

  const logosByChannel = new Map<string, string>();
  // Prefer in_use logos
  cache.logos.forEach(l => {
    if (!logosByChannel.has(l.channel) || l.in_use) {
      logosByChannel.set(l.channel, l.url);
    }
  });

  const mapped: ChannelData[] = sliced.map(c => ({
    id: c.id,
    name: c.name,
    alt_names: c.alt_names,
    country: c.country,
    categories: c.categories,
    is_nsfw: c.is_nsfw,
    logo: logosByChannel.get(c.id) || null,
    streams: streamsByChannel.get(c.id) || [],
  })).filter(c => c.streams.length > 0); // Only return channels with at least one stream

  return {
    data: mapped,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getChannelById(id: string): Promise<ChannelData | null> {
  const result = await getChannels({ ids: [id] });
  return result.data.length > 0 ? result.data[0] : null;
}
