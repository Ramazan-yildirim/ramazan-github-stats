const USERNAME = 'Ramazan-yildirim';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const SUCCESS_CACHE_SECONDS = 600;
const ERROR_CACHE_SECONDS = 60;
const FIRST_COMMIT_YEAR = 2023;

function buildOverviewQuery(years) {
  const commitVariables = years
    .map(
      (year) =>
        `$commits${year}From: DateTime! $commits${year}To: DateTime!`
    )
    .join('\n');
  const commitFields = years
    .map(
      (year) =>
        `commits${year}: contributionsCollection(from: $commits${year}From, to: $commits${year}To) { totalCommitContributions }`
    )
    .join('\n');

  return `
    query GitHubOverview(
    $login: String!
    $streakStart: DateTime!
    $now: DateTime!
    $repoCursor: String
    ${commitVariables}
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
        ${commitFields}
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
}

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
  const year = now.getUTCFullYear();
  const years = Array.from(
    { length: year - FIRST_COMMIT_YEAR + 1 },
    (_, index) => FIRST_COMMIT_YEAR + index
  );
  const streakStart = new Date(now);

  // GitHub limits a contribution collection to at most one year.
  streakStart.setUTCFullYear(streakStart.getUTCFullYear() - 1);
  streakStart.setUTCDate(streakStart.getUTCDate() + 1);

  const commitVariables = {};
  for (const commitYear of years) {
    commitVariables[`commits${commitYear}From`] = new Date(
      Date.UTC(commitYear, 0, 1)
    ).toISOString();
    commitVariables[`commits${commitYear}To`] =
      commitYear === year
        ? now.toISOString()
        : new Date(Date.UTC(commitYear + 1, 0, 1) - 1).toISOString();
  }

  return {
    year,
    years,
    commitVariables,
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
  const data = await githubGraphql(buildOverviewQuery(dateRange.years), {
    login: USERNAME,
    streakStart: dateRange.streakStart,
    now: dateRange.now,
    repoCursor: null,
    ...dateRange.commitVariables,
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

  const commitsByYear = dateRange.years.map(
    (year) => data.user[`commits${year}`]?.totalCommitContributions || 0
  );

  return {
    name: data.user.name || USERNAME,
    repositories: data.user.repositories.totalCount,
    stars: totals.stars,
    followers: data.user.followers.totalCount,
    forks: totals.forks,
    commits: commitsByYear.at(-1) || 0,
    totalCommits: commitsByYear.reduce((total, count) => total + count, 0),
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

const ICONS = {
  repositories: `<path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'/><path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z'/>`,
  stars: `<path d='m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.4l6.2-.9L12 2.8Z'/>`,
  followers: `<circle cx='9' cy='8' r='4'/><path d='M2 21a7 7 0 0 1 14 0M16 4.5a4 4 0 0 1 0 7.5M17.5 15a6 6 0 0 1 4.5 5.8'/>`,
  forks: `<circle cx='6' cy='5' r='2'/><circle cx='18' cy='5' r='2'/><circle cx='12' cy='19' r='2'/><path d='M6 7v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 13v4'/>`,
  commits: `<path d='M2 12h6M16 12h6'/><circle cx='12' cy='12' r='4'/>`,
  streak: `<rect x='3' y='5' width='18' height='16' rx='2'/><path d='M16 3v4M8 3v4M3 10h18M8 15l2 2 5-5'/>`,
};

function metric(value, label, x, y, icon, accent) {
  return `<g transform='translate(${x} ${y})'>
    <rect class='panel' width='216' height='74' rx='10'/>
    <rect x='1' y='1' width='3' height='72' rx='1.5' fill='${accent}' opacity='.9'/>
    <rect x='13' y='13' width='31' height='31' rx='7' fill='${accent}' opacity='.12'/>
    <g class='icon' stroke='${accent}' transform='translate(16.5 17) scale(.75)'>${icon}</g>
    <text class='label' x='53' y='27'>${escapeXml(label)}</text>
    <text class='value' x='53' y='57'>${escapeXml(value)}</text>
    <path d='M190 16h10' stroke='${accent}' opacity='.45' stroke-width='1.5'/>
  </g>`;
}

function createStatsSvg(stats) {
  return `<svg width='720' height='288' viewBox='0 0 720 288' fill='none' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='title description'>
  <title id='title'>GitHub Overview for ${escapeXml(USERNAME)}</title>
  <desc id='description'>Repositories, stars, followers, forks, yearly commits, and current contribution streak.</desc>
  <style>
    .name{font:650 20px 'Segoe UI',Arial,sans-serif;fill:#e4e9ee}
    .handle{font:12px 'Segoe UI',Arial,sans-serif;fill:#818d99}
    .eyebrow{font:600 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1.7px;fill:#7894ad}
    .monogram{font:700 17px 'Segoe UI',Arial,sans-serif;letter-spacing:1px;fill:#cbd5de}
    .panel{fill:#111922;stroke:#2a3642}
    .label{font:600 10px 'Segoe UI',Arial,sans-serif;letter-spacing:1.1px;fill:#8b98a5}
    .value{font:650 25px 'Segoe UI',Arial,sans-serif;fill:#dce3e9}
    .icon{fill:none;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
    .total-label{font:600 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1.35px;fill:#8da4b8}
    .total-value{font:700 24px 'Segoe UI',Arial,sans-serif;fill:#dce5ec}
    .total-meta{font:10px 'Segoe UI',Arial,sans-serif;fill:#788794}
  </style>
  <rect x='.5' y='.5' width='719' height='287' rx='14' fill='#0b1016' stroke='#26313b'/>
  <rect x='24' y='20' width='54' height='54' rx='12' fill='#172330' stroke='#3a4a59'/>
  <path d='M24 61 65 20h13v13L37 74H24Z' fill='#6f8da8' opacity='.12'/>
  <text class='monogram' x='51' y='54' text-anchor='middle'>RY</text>
  <text class='eyebrow' x='96' y='27'>GITHUB OVERVIEW</text>
  <text class='name' x='96' y='50'>${escapeXml(stats.name)}</text>
  <text class='handle' x='96' y='70'>@${escapeXml(USERNAME)}</text>
  <rect x='492' y='18' width='204' height='58' rx='11' fill='#14202b' stroke='#354858'/>
  <rect x='492' y='18' width='4' height='58' rx='2' fill='#6f8da8'/>
  <text class='total-label' x='510' y='37'>TOTAL COMMITS</text>
  <text class='total-value' x='510' y='65'>${escapeXml(stats.totalCommits)}</text>
  <text class='total-meta' x='678' y='62' text-anchor='end'>SINCE ${FIRST_COMMIT_YEAR}</text>
  <path d='M24 91H696' stroke='#222c36'/>
  ${metric(stats.repositories, 'REPOSITORIES', 24, 105, ICONS.repositories, '#6f8da8')}
  ${metric(stats.stars, 'STARS', 252, 105, ICONS.stars, '#a08b61')}
  ${metric(stats.followers, 'FOLLOWERS', 480, 105, ICONS.followers, '#6f9185')}
  ${metric(stats.forks, 'FORKS', 24, 190, ICONS.forks, '#827b96')}
  ${metric(stats.commits, `COMMITS ${stats.year}`, 252, 190, ICONS.commits, '#9a7669')}
  ${metric(stats.streak, 'CURRENT STREAK', 480, 190, ICONS.streak, '#8b8465')}
</svg>`;
}

function createErrorSvg() {
  return `<svg width='720' height='120' viewBox='0 0 720 120' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='error-title'><title id='error-title'>GitHub statistics are temporarily unavailable</title><rect x='.5' y='.5' width='719' height='119' rx='14' fill='#0b1016' stroke='#26313b'/><rect x='24' y='24' width='48' height='48' rx='11' fill='#141c24' stroke='#303c48'/><text x='48' y='54' text-anchor='middle' fill='#8d99a5' font-size='12' font-weight='700' font-family='Segoe UI,Arial,sans-serif'>RY</text><text x='92' y='54' fill='#c7d0d8' font-size='16' font-family='Segoe UI,Arial,sans-serif'>GitHub statistics are temporarily unavailable.</text><text x='92' y='76' fill='#66727e' font-size='11' font-family='Segoe UI,Arial,sans-serif'>Please try again shortly.</text></svg>`;
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
