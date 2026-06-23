
const cache = new Map();

/**
 * Simple in-memory cache with TTL support
 */
export const cacheService = {
    get: (key) => {
        const entry = cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            cache.delete(key);
            return null;
        }
        return entry.value;
    },

    set: (key, value, ttlSeconds = 3600) => {
        cache.set(key, {
            value,
            expiry: Date.now() + (ttlSeconds * 1000)
        });
    },

    clear: () => cache.clear()
};
