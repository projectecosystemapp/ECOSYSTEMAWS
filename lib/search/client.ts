import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

// PERFORMANCE: Frontend search client with intelligent caching and request optimization
// Baseline: Direct API calls, no caching, redundant requests
// Target: 50ms cache hits, request deduplication, optimistic updates
// Technique: Multi-tier caching, request batching, background preloading

export interface SearchOptions {
  query?: string;
  filters?: SearchFilters;
  location?: GeoLocation;
  radius?: number;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  aggregations?: string[];
  includeAnalytics?: boolean;
  cacheStrategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
  preload?: boolean;
}

export interface SearchFilters {
  category?: string[];
  priceRange?: { min?: number; max?: number };
  dateRange?: { start?: string; end?: string };
  rating?: { min?: number };
  status?: string[];
  providerId?: string;
  customerId?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
  mode?: 'min' | 'max' | 'avg';
}

export interface PaginationOptions {
  page: number;
  size: number;
}

export interface SearchResult {
  hits: {
    total: number;
    items: SearchItem[];
    maxScore: number;
  };
  aggregations?: Record<string, any>;
  analytics?: SearchAnalytics;
  performanceMetrics: {
    searchTime: number;
    cacheHit: boolean;
  };
}

export interface SearchItem {
  id: string;
  score: number;
  source: any;
  highlight?: Record<string, string[]>;
  fields?: Record<string, any>;
}

export interface SearchAnalytics {
  popularCategories: Array<{ key: string; count: number }>;
  priceDistribution: Array<{ range: string; count: number }>;
  geographicDistribution: Array<{ location: string; count: number }>;
  timeDistribution: Array<{ timeSlot: string; count: number }>;
}

class SearchClient {
  private client = generateClient<Schema>();
  private cache = new SearchCache();
  private requestDeduplicator = new RequestDeduplicator();
  private preloader = new SearchPreloader(this);

  // PERFORMANCE: Service search with intelligent caching and filtering
  async searchServices(options: SearchOptions): Promise<SearchResult> {
    const cacheKey = this.generateCacheKey('services', options);
    
    // Check cache strategy
    if (options.cacheStrategy === 'cache-only') {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
      throw new Error('No cached result available');
    }

    if (options.cacheStrategy !== 'network-only') {
      const cached = await this.cache.get(cacheKey);
      if (cached && options.cacheStrategy === 'cache-first') {
        // Background refresh for cache-first strategy
        this.refreshInBackground('searchServices', options, cacheKey);
        return cached;
      }
      if (cached && options.cacheStrategy === 'network-first') {
        // Use cache as fallback
        try {
          const fresh = await this.executeServiceSearch(options);
          await this.cache.set(cacheKey, fresh);
          return fresh;
        } catch (error) {
          console.warn('Network request failed, using cache:', error);
          return cached;
        }
      }
    }

    // Deduplicate identical requests
    return this.requestDeduplicator.execute(cacheKey, () => 
      this.executeServiceSearch(options)
    );
  }

  private async executeServiceSearch(options: SearchOptions): Promise<SearchResult> {
    const response = await this.client.queries.searchEngine({
      action: 'searchServices',
      query: nullableToString(options.query),
      filters: nullableToString(options.filters),
      location: nullableToString(options.location),
      radius: nullableToString(options.radius),
      sort: nullableToString(options.sort),
      pagination: nullableToString(options.pagination),
      aggregations: nullableToString(options.aggregations),
      includeAnalytics: options.includeAnalytics
    });

    if (response.errors) {
      throw new Error(`Search failed: ${response.errors.map(e => e.message).join(', ')}`);
    }

    const result = response.data as SearchResult;
    
    // Cache successful results
    const cacheKey = this.generateCacheKey('services', options);
    await this.cache.set(cacheKey, result);
    
    // Preload related searches if enabled
    if (options.preload) {
      this.preloader.preloadRelatedSearches('services', options, result);
    }

    return result;
  }

  // PERFORMANCE: Geo-location search with distance calculation and map bounds optimization
  async geoSearch(options: SearchOptions): Promise<SearchResult> {
    if (!options.location) {
      throw new Error('Location is required for geo search');
    }

    const cacheKey = this.generateCacheKey('geo', options);
    
    // Check for cached results within expanded radius (for map panning efficiency)
    const expandedOptions = {
      ...options,
      radius: (options.radius || 10) * 1.5 // Search wider area for cache efficiency
    };
    const expandedCacheKey = this.generateCacheKey('geo', expandedOptions);
    const cachedExpanded = await this.cache.get(expandedCacheKey);
    
    if (cachedExpanded) {
      // Filter cached results to requested radius
      const filtered = this.filterByDistance(cachedExpanded, options.location, options.radius || 10);
      if (filtered.hits.items.length > 0) {
        return filtered;
      }
    }

    return this.requestDeduplicator.execute(cacheKey, async () => {
      const response = await this.client.queries.searchEngine({
        action: 'geoSearch',
        location: nullableToString(options.location),
        radius: options.radius || 10,
        filters: nullableToString(options.filters),
        sort: nullableToString(options.sort),
        pagination: options.pagination
      });

      if (response.errors) {
        throw new Error(`Geo search failed: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const result = response.data as SearchResult;
      await this.cache.set(cacheKey, result);
      return result;
    });
  }

  // PERFORMANCE: Real-time autocomplete with debouncing and prefix caching
  async autoComplete(query: string, category?: string): Promise<SearchItem[]> {
    if (!query || query.length < 2) return [];

    const cacheKey = `autocomplete:${query.toLowerCase()}:${category || 'all'}`;
    
    // Check prefix cache for performance
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached.hits.items;

    // Check if we have a longer query cached (substring matching)
    for (let i = query.length + 1; i <= query.length + 5; i++) {
      const longerCacheKey = `autocomplete:${query.toLowerCase()}`;
      const longerCached = await this.cache.getByPrefix(longerCacheKey);
      if (longerCached) {
        // Filter results that start with current query
        const filtered = longerCached.hits.items.filter((item: SearchItem) =>
          item.source.title.toLowerCase().startsWith(query.toLowerCase())
        );
        if (filtered.length > 0) {
          const result = { ...longerCached, hits: { ...longerCached.hits, items: filtered } };
          await this.cache.set(cacheKey, result, 300); // Cache filtered results
          return filtered;
        }
      }
    }

    const response = await this.client.queries.searchEngine({
      action: 'autoComplete',
      query,
      filters: category ? { category: [category] } : undefined
    });

    if (response.errors) {
      console.warn('Autocomplete failed:', response.errors);
      return [];
    }

    const result = response.data as SearchResult;
    await this.cache.set(cacheKey, result, 300); // 5-minute cache for autocomplete
    return result.hits.items;
  }

  // PERFORMANCE: Booking search with provider/customer filtering
  async searchBookings(options: SearchOptions): Promise<SearchResult> {
    const cacheKey = this.generateCacheKey('bookings', options);
    
    // Bookings change frequently, use shorter cache TTL
    const cached = await this.cache.get(cacheKey);
    if (cached && options.cacheStrategy !== 'network-only') {
      const age = Date.now() - cached._cacheTimestamp;
      if (age < 60000) { // 1-minute freshness for bookings
        return cached;
      }
    }

    const response = await this.client.queries.searchEngine({
      action: 'searchBookings',
      filters: nullableToString(options.filters),
      sort: nullableToString(options.sort),
      pagination: nullableToString(options.pagination),
      aggregations: options.aggregations
    });

    if (response.errors) {
      throw new Error(`Booking search failed: ${response.errors.map(e => e.message).join(', ')}`);
    }

    const result = response.data as SearchResult;
    await this.cache.set(cacheKey, result, 60); // 1-minute cache for booking data
    return result;
  }

  // PERFORMANCE: Analytics dashboard with aggregated insights
  async getAnalytics(dateRange?: { start: string; end: string }): Promise<SearchAnalytics> {
    const cacheKey = `analytics:${dateRange?.start || 'all'}:${dateRange?.end || 'all'}`;
    
    // Analytics can be cached longer since they don't need real-time updates
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached._cacheTimestamp;
      if (age < 300000) { // 5-minute cache for analytics
        return cached.analytics;
      }
    }

    const response = await this.client.queries.searchEngine({
      action: 'getAnalytics',
      filters: dateRange ? { dateRange } : undefined
    });

    if (response.errors) {
      throw new Error(`Analytics failed: ${response.errors.map(e => e.message).join(', ')}`);
    }

    const result = response.data as SearchResult;
    await this.cache.set(cacheKey, result, 300); // 5-minute cache for analytics
    return result.analytics!;
  }

  // PERFORMANCE: Real-time search suggestions based on user behavior
  async getSearchSuggestions(userLocation?: GeoLocation): Promise<string[]> {
    const cacheKey = `suggestions:${userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'global'}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Get popular searches from analytics
    const analytics = await this.getAnalytics();
    const suggestions = [
      ...analytics.popularCategories.slice(0, 5).map(cat => cat.key),
      'yoga classes near me',
      'massage therapy',
      'personal training',
      'music lessons'
    ];

    await this.cache.set(cacheKey, suggestions, 3600); // 1-hour cache for suggestions
    return suggestions;
  }

  // PERFORMANCE: Batch multiple searches for efficiency
  async batchSearch(searches: Array<{ id: string; options: SearchOptions }>): Promise<Record<string, SearchResult>> {
    const results: Record<string, SearchResult> = {};
    
    // Group searches by type for optimization
    const serviceSearches = searches.filter(s => !s.options.filters?.customerId && !s.options.filters?.providerId);
    const bookingSearches = searches.filter(s => s.options.filters?.customerId || s.options.filters?.providerId);
    
    // Execute service searches in parallel
    const servicePromises = serviceSearches.map(async search => {
      results[search.id] = await this.searchServices(search.options);
    });
    
    // Execute booking searches in parallel
    const bookingPromises = bookingSearches.map(async search => {
      results[search.id] = await this.searchBookings(search.options);
    });

    await Promise.all([...servicePromises, ...bookingPromises]);
    return results;
  }

  // Helper methods
  private generateCacheKey(type: string, options: SearchOptions): string {
    const keyData = {
      type,
      query: nullableToString(options.query),
      filters: nullableToString(options.filters),
      location: options.location ? {
        lat: Math.round(options.location.latitude * 100) / 100, // Round to 2 decimals for cache efficiency
        lon: Math.round(options.location.longitude * 100) / 100
      } : undefined,
      radius: nullableToString(options.radius),
      sort: nullableToString(options.sort),
      pagination: options.pagination
    };

    return btoa(JSON.stringify(keyData)).substring(0, 32);
  }

  private filterByDistance(result: SearchResult, location: GeoLocation, radiusKm: number): SearchResult {
    const filteredItems = result.hits.items.filter(item => {
      if (!item.fields?.distance) return true;
      return item.fields.distance <= radiusKm;
    });

    return {
      ...result,
      hits: {
        ...result.hits,
        items: filteredItems,
        total: filteredItems.length
      }
    };
  }

  private async refreshInBackground(method: string, options: SearchOptions, cacheKey: string): Promise<void> {
    try {
      // Don't await - fire and forget background refresh
      setTimeout(async () => {
        const fresh = await this.executeServiceSearch(options);
        await this.cache.set(cacheKey, fresh);
      }, 100);
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  // Public method to clear cache
  async clearCache(pattern?: string): Promise<void> {
    await this.cache.clear(pattern);
  }

  // Public method to warm up cache
  async warmUpCache(commonSearches: SearchOptions[]): Promise<void> {
    const promises = commonSearches.map(options => 
      this.searchServices({ ...options, cacheStrategy: 'network-only' })
    );
    
    await Promise.allSettled(promises);
  }
}

// PERFORMANCE: Multi-tier caching with LRU and time-based eviction
class SearchCache {
  private memoryCache = new Map<string, { data: any; expires: number; timestamp: number }>();
  private readonly maxMemoryEntries = 500;
  private readonly defaultTTL = 600; // 10 minutes

  async get(key: string): Promise<any> {
    const cached = this.memoryCache.get(key);
    if (cached) {
      if (cached.expires > Date.now()) {
        // Move to end for LRU
        this.memoryCache.delete(key);
        this.memoryCache.set(key, cached);
        return { ...cached.data, _cacheTimestamp: cached.timestamp };
      } else {
        this.memoryCache.delete(key);
      }
    }

    return null;
  }

  async getByPrefix(prefix: string): Promise<any> {
    for (const [key, cached] of this.memoryCache.entries()) {
      if (key.startsWith(prefix) && cached.expires > Date.now()) {
        return { ...cached.data, _cacheTimestamp: cached.timestamp };
      }
    }
    return null;
  }

  async set(key: string, data: any, ttlSeconds: number = this.defaultTTL): Promise<void> {
    // Implement LRU eviction
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    const timestamp = Date.now();
    this.memoryCache.set(key, {
      data,
      expires: timestamp + (ttlSeconds * 1000),
      timestamp
    });
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      this.memoryCache.clear();
    }
  }

  // Get cache statistics for monitoring
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, cached] of this.memoryCache.entries()) {
      if (cached.expires > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: nullableToString(this.memoryCache.size),
      validEntries,
      expiredEntries,
      hitRate: this.hitRate
    };
  }

  private hitRate = 0; // Would track hit/miss ratio in production
}

// PERFORMANCE: Request deduplication to prevent redundant API calls
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Return existing promise if request is already in flight
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request promise
    const promise = fn().finally(() => {
      // Clean up when request completes
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

// PERFORMANCE: Intelligent preloading based on user behavior patterns
class SearchPreloader {
  constructor(private client: SearchClient) {}

  async preloadRelatedSearches(type: string, options: SearchOptions, result: SearchResult): Promise<void> {
    // Don't await - fire and forget preloading
    setTimeout(async () => {
      try {
        if (type === 'services') {
          await this.preloadServiceRelated(options, result);
        }
      } catch (error) {
        console.debug('Preload failed:', error);
      }
    }, 500);
  }

  private async preloadServiceRelated(options: SearchOptions, result: SearchResult): Promise<void> {
    const preloadTasks: Promise<any>[] = [];

    // Preload next page
    if (result.hits.total > (options.pagination?.size || 20)) {
      const nextPageOptions: SearchOptions = {
        ...options,
        pagination: {
          page: (options.pagination?.page || 1) + 1,
          size: options.pagination?.size || 20
        },
        cacheStrategy: 'network-only'
      };
      preloadTasks.push(this.client.searchServices(nextPageOptions));
    }

    // Preload popular categories from aggregations
    if (result.aggregations?.categories) {
      const popularCategories = result.aggregations.categories.buckets
        .slice(0, 3)
        .map((bucket: any) => bucket.key);

      for (const category of popularCategories) {
        if (!options.filters?.category?.includes(category)) {
          const categoryOptions: SearchOptions = {
            ...options,
            filters: { ...options.filters, category: [category] },
            cacheStrategy: 'network-only'
          };
          preloadTasks.push(this.client.searchServices(categoryOptions));
        }
      }
    }

    // Execute preload tasks without blocking
    Promise.allSettled(preloadTasks);
  }
}

// Singleton instance
export const searchClient = new SearchClient();