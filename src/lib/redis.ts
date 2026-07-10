import { Redis } from '@upstash/redis';
import { config } from '../../config';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else {
  console.warn("Upstash Redis credentials not found. Visitor counter will not work.");
}

export async function incrementVisitorCount(): Promise<number> {
  if (!config.features.visitorCounter || !redis) {
    return 0; // Return a default value or mock
  }

  try {
    const count = await redis.incr(`github-profile-visitors:${config.github.username}`);
    return count;
  } catch (error) {
    console.error("Failed to increment visitor count:", error);
    return 0;
  }
}

export async function getVisitorCount(): Promise<number> {
  if (!config.features.visitorCounter || !redis) {
    return 0;
  }

  try {
    const count = await redis.get<number>(`github-profile-visitors:${config.github.username}`);
    return count || 0;
  } catch (error) {
    console.error("Failed to fetch visitor count:", error);
    return 0;
  }
}
