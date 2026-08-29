const USERNAME = 'Ramazan-yildirim';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const SUCCESS_CACHE_SECONDS = 600;
const ERROR_CACHE_SECONDS = 60;

const OVERVIEW_QUERY = `
  query GitHubOverview(
    $login: String!
    $yearStart: DateTime!
    $streakStart: DateTime!
    $now: DateTime!
    $repoCursor: String
  ) {
    user(login: $login) {
      name
      followers { totalCount }
      repositories(
        first: 100
        after: $repoCursor
        ownerAffiliations: [OWNER]
        isFork: false
        privacy: PUBLIC
      ) {
        totalCount
        nodes { stargazerCount forkCount }
        pageInfo { hasNextPage endCursor }
      }
      currentYear: contributionsCollection(from: $yearStart, to: $now) {
        totalCommitContributions
      }
      streakWindow: contributionsCollection(from: $streakStart, to: $now) {
        contributionCalendar {
          weeks {
            contributionDays { date contributionCount }
          }
        }
      }
    }
  }
`;

const REPOSITORIES_QUERY = `
  query RepositoryPage($login: String!, $repoCursor: String!) {
    user(login: $login) {
      repositories(
        first: 100
        after: $repoCursor
        ownerAffiliations: [OWNER]
        isFork: false
        privacy: PUBLIC
      ) {
        nodes { stargazerCount forkCount }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

async function githubGraphql(query, variables) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GitHub authentication is unavailable');

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors?.length || !payload.data) {
    throw new Error('GitHub API returned an invalid response');
  }

  return payload.data;
}

function getDateRange(now = new Date()) {
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const streakStart = new Date(now);

  // GitHub limits a contribution collection to at most one year.
  streakStart.setUTCFullYear(streakStart.getUTCFullYear() - 1);
  streakStart.setUTCDate(streakStart.getUTCDate() + 1);

  return {
    year: now.getUTCFullYear(),
    yearStart: yearStart.toISOString(),
    streakStart: streakStart.toISOString(),
    now: now.toISOString(),
  };
}

function calculateCurrentStreak(weeks) {
  const days = weeks
    .flatMap((week) => week.contributionDays)
    .sort((first, second) => first.date.localeCompare(second.date));
  let index = days.length - 1;

  // Today may still receive a contribution, so yesterday keeps the streak active.
  if (days[index]?.contributionCount === 0) index--;

  let streak = 0;
  while (index >= 0 && days[index].contributionCount > 0) {
    streak++;
    index--;
  }

  return streak;
}

function sumRepositoryMetrics(repositories, totals) {
  for (const repository of repositories) {
    totals.stars += repository.stargazerCount;
    totals.forks += repository.forkCount;
  }
}

async function getOverview() {
  const dateRange = getDateRange();
  const data = await githubGraphql(OVERVIEW_QUERY, {
    login: USERNAME,
    yearStart: dateRange.yearStart,
    streakStart: dateRange.streakStart,
    now: dateRange.now,
    repoCursor: null,
  });

  if (!data.user) throw new Error('GitHub user was not found');

  const totals = { stars: 0, forks: 0 };
  let repositories = data.user.repositories;
  sumRepositoryMetrics(repositories.nodes, totals);

  // Usually one request; pagination only runs after 100 original public repos.
  while (repositories.pageInfo.hasNextPage) {
    const nextPage = await githubGraphql(REPOSITORIES_QUERY, {
      login: USERNAME,
      repoCursor: repositories.pageInfo.endCursor,
    });

    if (!nextPage.user) throw new Error('GitHub user was not found');

    repositories = nextPage.user.repositories;
    sumRepositoryMetrics(repositories.nodes, totals);
  }

  return {
    name: data.user.name || USERNAME,
    repositories: data.user.repositories.totalCount,
    stars: totals.stars,
    followers: data.user.followers.totalCount,
    forks: totals.forks,
    commits: data.user.currentYear.totalCommitContributions,
    year: dateRange.year,
    streak: calculateCurrentStreak(
      data.user.streakWindow.contributionCalendar.weeks
    ),
  };
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\x22/g, '&quot;')
    .replace(/\x27/g, '&apos;');
}

function metric(value, label, x, y) {
  return `<g transform='translate(${x} ${y})'><text class='value' text-anchor='middle'>${escapeXml(value)}</text><text class='label' y='25' text-anchor='middle'>${escapeXml(label)}</text></g>`;
}

function createStatsSvg(stats) {
  return `<svg width='720' height='260' viewBox='0 0 720 260' fill='none' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='title description'>
  <title id='title'>GitHub Overview for ${escapeXml(USERNAME)}</title>
  <desc id='description'>Repositories, stars, followers, forks, yearly commits, and current contribution streak.</desc>
  <style>.title{font:700 20px 'Segoe UI',Arial,sans-serif}.name{font:600 15px 'Segoe UI',Arial,sans-serif}.handle,.label{font:13px 'Segoe UI',Arial,sans-serif}.value{font:700 24px 'Segoe UI',Arial,sans-serif;fill:#3fb950}.label,.handle{fill:#8b949e}</style>
  <rect x='.5' y='.5' width='719' height='259' rx='14' fill='#0d1117' stroke='#30363d'/>
  <rect width='5' height='260' rx='2.5' fill='#238636'/>
  <text class='title' x='30' y='37' fill='#f0f6fc'>GitHub Overview</text>
  <text class='name' x='30' y='65' fill='#c9d1d9'>${escapeXml(stats.name)}</text>
  <text class='handle' x='690' y='65' text-anchor='end'>@${escapeXml(USERNAME)}</text>
  <path d='M30 84H690' stroke='#21262d'/>
  ${metric(stats.repositories, 'Repositories', 120, 126)}
  ${metric(stats.stars, 'Stars', 360, 126)}
  ${metric(stats.followers, 'Followers', 600, 126)}
  ${metric(stats.forks, 'Forks', 120, 207)}
  ${metric(stats.commits, `Commits ${stats.year}`, 360, 207)}
  ${metric(stats.streak, 'Current Streak', 600, 207)}
</svg>`;
}

function createErrorSvg() {
  return `<svg width='720' height='120' viewBox='0 0 720 120' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='error-title'><title id='error-title'>GitHub statistics are temporarily unavailable</title><rect x='.5' y='.5' width='719' height='119' rx='14' fill='#0d1117' stroke='#30363d'/><rect width='5' height='120' rx='2.5' fill='#f85149'/><text x='30' y='66' fill='#c9d1d9' font-size='17' font-family='Segoe UI,Arial,sans-serif'>GitHub statistics are temporarily unavailable.</text></svg>`;
}

function svgResponse(svg, cacheSeconds) {
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vercel-CDN-Cache-Control': `public, max-age=${cacheSeconds}`,
    },
  });
}

export default {
  async fetch() {
    try {
      return svgResponse(createStatsSvg(await getOverview()), SUCCESS_CACHE_SECONDS);
    } catch {
      return svgResponse(createErrorSvg(), ERROR_CACHE_SECONDS);
    }
  },
};
