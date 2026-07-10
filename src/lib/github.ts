import { config } from '../../config';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = 'https://api.github.com/graphql';

export interface GitHubStats {
  followers: number;
  following: number;
  repositories: number;
  stars: number;
  forks: number;
  commits: number;
  pullRequests: number;
  issues: number;
  linesOfCode: number;
  contributionStreak: number;
  accountAge: string;
}

const STATS_QUERY = `
  query userInfo($login: String!) {
    user(login: $login) {
      createdAt
      followers {
        totalCount
      }
      following {
        totalCount
      }
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}) {
        totalCount
        nodes {
          stargazers {
            totalCount
          }
          forkCount
          languages(first: 10) {
            edges {
              size
            }
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        contributionCalendar {
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

function calculateStreak(weeks: any[]): number {
  let streak = 0;
  let isActive = true;

  // Flatten days and reverse to start from today going backwards
  const days = weeks
    .flatMap(week => week.contributionDays)
    .reverse();

  for (const day of days) {
    if (day.contributionCount === 0) {
      // If it's today and 0, we check yesterday. 
      // A simple heuristic: if we hit a 0, we break. 
      // (This is a simplified streak calculator)
      if (streak === 0) {
        continue; // maybe haven't contributed today yet
      }
      break;
    }
    streak++;
  }
  return streak;
}

export async function fetchGitHubStats(): Promise<GitHubStats> {
  if (!GITHUB_TOKEN) {
    console.warn("No GITHUB_TOKEN provided. Returning mock data.");
    return getMockStats();
  }

  try {
    const response = await fetch(GITHUB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        query: STATS_QUERY,
        variables: {
          login: config.github.username,
        },
      }),
      // Revalidate every 5 minutes
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const { data, errors } = await response.json();
    
    if (errors) {
      console.error(errors);
      throw new Error("GraphQL returned errors");
    }

    const user = data.user;
    
    let stars = 0;
    let forks = 0;
    let linesOfCode = 0;

    user.repositories.nodes.forEach((repo: any) => {
      stars += repo.stargazers.totalCount;
      forks += repo.forkCount;
      repo.languages.edges.forEach((lang: any) => {
        linesOfCode += lang.size;
      });
    });
    
    // Estimate lines of code based on byte size (approx 30-50 bytes per line, let's use 40)
    const estimatedLoc = Math.round(linesOfCode / 40);

    const weeks = user.contributionsCollection.contributionCalendar.weeks;
    const contributionStreak = calculateStreak(weeks);

    const createdAt = new Date(user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const accountAge = `${Math.floor(diffDays / 365)} years, ${Math.floor((diffDays % 365) / 30)} months`;

    return {
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      repositories: user.repositories.totalCount,
      stars,
      forks,
      commits: user.contributionsCollection.totalCommitContributions,
      pullRequests: user.contributionsCollection.totalPullRequestContributions,
      issues: user.contributionsCollection.totalIssueContributions,
      linesOfCode: estimatedLoc,
      contributionStreak,
      accountAge
    };
  } catch (error) {
    console.error("Failed to fetch GitHub stats:", error);
    return getMockStats();
  }
}

function getMockStats(): GitHubStats {
  return {
    followers: 1234,
    following: 56,
    repositories: 42,
    stars: 890,
    forks: 150,
    commits: 3450,
    pullRequests: 120,
    issues: 45,
    linesOfCode: 456780,
    contributionStreak: 12,
    accountAge: "4 years, 2 months"
  };
}
