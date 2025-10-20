/**
 * Cache abstraction layer
 *
 * Simple in-memory cache with TTL support.
 * Can be swapped for Redis in production.
 *
 * Philosophy: Simple caching for better performance
 */

export interface CacheConfig {
  defaultTTL?: number; // Default TTL in seconds (default: 3600)
  maxSize?: number; // Maximum cache entries (default: 1000)
  cleanupInterval?: number; // Cleanup interval in ms (default: 60000)
}

export interface CacheEntry<T> {
  value: T;
  expiry: number;
  size: number;
}

/**
 * Simple in-memory cache with TTL
 */
export class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private config: Required<CacheConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 3600,
      maxSize: config.maxSize || 1000,
      cleanupInterval: config.cleanupInterval || 60000
    };

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.config.defaultTTL;
    const size = this.estimateSize(value);

    // Check if we need to evict entries
    if (this.store.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.store.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000),
      size
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    console.log('✓ Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    let totalSize = 0;
    for (const entry of this.store.values()) {
      totalSize += entry.size;
    }

    return {
      size: this.store.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      totalSize,
      defaultTTL: this.config.defaultTTL
    };
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple values at once
   */
  async mset(entries: Map<string, any>, ttlSeconds?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttlSeconds);
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, by: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + by;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 100; // Default estimate
    }
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.expiry < oldestExpiry) {
        oldestKey = key;
        oldestExpiry = entry.expiry;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`✓ Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.config.cleanupInterval
    );
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
