import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Cache en memoria local para fallback rápido (Seguridad + Performance local)
interface MemoryLimit {
  count: number;
  resetAt: number;
}
const memoryCache = new Map<string, MemoryLimit>();

// Limpieza periódica de caché en memoria para evitar leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of memoryCache.entries()) {
    if (now > limit.resetAt) {
      memoryCache.delete(key);
    }
  }
}, 60000).unref?.(); // .unref() evita que Node bloquee la salida en scripts

// Lazy initialization to avoid errors when URL is invalid
let redis: any = null;

const getRedis = () => {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } catch (err) {
      console.error("[rateLimiter] Failed to initialize Redis:", err);
      return null;
    }
  }
  return redis;
};

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

// Implementación del fallback local en memoria
const checkMemoryRateLimit = (key: string, config: RateLimitConfig) => {
  const now = Date.now();
  const cached = memoryCache.get(key);

  if (!cached || now > cached.resetAt) {
    // Primera petición o ventana expirada
    const resetAt = now + config.windowMs;
    memoryCache.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.max - 1, resetAt };
  }

  if (cached.count >= config.max) {
    // Límite alcanzado
    return { success: false, remaining: 0, resetAt: cached.resetAt };
  }

  // Incrementar contador
  cached.count += 1;
  memoryCache.set(key, cached);
  return { success: true, remaining: config.max - cached.count, resetAt: cached.resetAt };
};

export const checkRateLimit = async (key: string, config: RateLimitConfig) => {
  try {
    const redisClient = getRedis();
    if (!redisClient) {
      // Usar en-memoria si Upstash no está configurado
      return checkMemoryRateLimit(key, config);
    }

    const ratelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.max, `${config.windowMs}ms`),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(key);
    return { success, remaining, resetAt: reset };
  } catch (err) {
    console.error("[rateLimiter] Redis rate limiter error, falling back to local memory limit:", err);
    // En lugar de fail open total, recurrimos a memoria
    return checkMemoryRateLimit(key, config);
  }
};

export const getClientIp = (event: any): string => {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"] ||
    "unknown-ip"
  );
};
