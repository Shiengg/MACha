// Simple in-memory cache service with TTL (Time To Live) and pending requests
class CacheService {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.pendingRequests = new Map(); // Track pending requests to prevent duplicate calls
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) {
      return null;
    }

    if (Date.now() > timestamp) {
      // Expired, remove from cache
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.pendingRequests.delete(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.pendingRequests.clear();
  }

  // Invalidate cache for a specific key pattern
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }

  // Get or create a pending request promise
  // This ensures only one request is made for the same key at a time
  async getOrSetPending(key, fetchFn, ttl = this.defaultTTL) {
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      console.log(`✅ [CACHE] Hit for key: ${key}`);
      return cached;
    }

    // Check if there's already a pending request
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ [CACHE] Waiting for pending request: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Create new request promise
    console.log(`📤 [CACHE] Creating new request for key: ${key}`);
    const requestPromise = fetchFn()
      .then((result) => {
        if (result !== null && result !== undefined) {
          this.set(key, result, ttl);
          console.log(`💾 [CACHE] Cached result for key: ${key}`);
        }
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        console.error(`❌ [CACHE] Error for key: ${key}`, error);
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }
}

export const cacheService = new CacheService();

