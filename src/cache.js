// High-Performance In-Memory TTL & LRU Cache
export class MemoryCache {
  constructor(defaultTTLSeconds = 300, maxEntries = 1000) {
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.maxEntries = maxEntries;
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, item);
    this.stats.hits++;
    return item.value;
  }

  set(key, value, customTTLSeconds = null) {
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const ttl = (customTTLSeconds ? customTTLSeconds * 1000 : this.defaultTTL);
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + "%" : "0%";
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate
    };
  }
}

export const appCache = new MemoryCache(600, 2000); // 10 min default TTL, max 2000 entries
