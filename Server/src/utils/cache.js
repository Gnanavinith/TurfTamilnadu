import { redis } from '../config/redis.js'

export const cacheKey = (...parts) => parts.map(String).join(':')

export async function cacheGet(key) {
  const raw = await redis.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function cacheDel(pattern) {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) await redis.del(...keys)
}

export async function cacheWrap(key, ttlSeconds, loader) {
  const cached = await cacheGet(key)
  if (cached !== null) return cached
  const value = await loader()
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds)
  }
  return value
}

export default { cacheKey, cacheGet, cacheSet, cacheDel, cacheWrap }