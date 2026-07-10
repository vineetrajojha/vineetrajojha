import { NextRequest } from 'next/server';
import { fetchGitHubStats } from '../../../lib/github';
import { getVisitorCount, incrementVisitorCount } from '../../../lib/redis';
import { generateSvg } from '../../../lib/svg-generator';

export const revalidate = 0; // Dynamic route, we handle caching with Cache-Control headers

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const themeParam = searchParams.get('theme');
    
    // Default to dark theme if not specified
    const theme = themeParam === 'light' ? 'light' : 'dark';

    // Run fetches concurrently
    const [stats, visitorCountResult] = await Promise.all([
      fetchGitHubStats(),
      incrementVisitorCount(), // increment and return the new count
    ]);

    const svg = await generateSvg({
      theme,
      stats,
      visitors: visitorCountResult,
    });

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        // Cache the SVG for 5 minutes at the edge, and serve stale while revalidating
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating SVG:', error);
    return new Response('Error generating SVG', { status: 500 });
  }
}
