const USERNAME = 'Ramazan-yildirim';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const SUCCESS_CACHE_SECONDS = 600;
const ERROR_CACHE_SECONDS = 60;
const FIRST_CONTRIBUTION_YEAR = 2023;

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
        `commits${year}: contributionsCollection(from: $commits${year}From, to: $commits${year}To) {
          contributionCalendar { totalContributions }
          restrictedContributionsCount
        }`
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
      }
      viewer {
        login
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
    { length: year - FIRST_CONTRIBUTION_YEAR + 1 },
    (_, index) => FIRST_CONTRIBUTION_YEAR + index
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

  if (!data.user || !data.viewer) {
    throw new Error('GitHub account data is unavailable');
  }

  if (data.viewer.login.toLowerCase() !== USERNAME.toLowerCase()) {
    throw new Error('GitHub token belongs to a different account');
  }

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

  const contributionsByYear = dateRange.years.map((year) => {
    const collection = data.viewer[`commits${year}`];
    return (
      (collection?.contributionCalendar?.totalContributions || 0) +
      (collection?.restrictedContributionsCount || 0)
    );
  });

  return {
    name: data.user.name || USERNAME,
    repositories: data.user.repositories.totalCount,
    stars: totals.stars,
    followers: data.user.followers.totalCount,
    forks: totals.forks,
    contributions: contributionsByYear.at(-1) || 0,
    totalContributions: contributionsByYear.reduce(
      (total, count) => total + count,
      0
    ),
    year: dateRange.year,
    streak: calculateCurrentStreak(
      data.viewer.streakWindow.contributionCalendar.weeks
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
  activity: `<path d='M3 12h4l2.2-5 4.1 10 2.4-5H21'/>`,
  streak: `<rect x='3' y='5' width='18' height='16' rx='2'/><path d='M16 3v4M8 3v4M3 10h18M8 15l2 2 5-5'/>`,
};

function compactMetric(value, label, x, icon, accent) {
  return `<g transform='translate(${x} 278)'>
    <rect width='158' height='56' rx='11' fill='#11171d' stroke='#303943'/>
    <rect width='3' height='28' y='14' rx='1.5' fill='${accent}' opacity='.8'/>
    <rect x='13' y='13' width='30' height='30' rx='8' fill='${accent}' opacity='.13'/>
    <g class='icon' stroke='${accent}' transform='translate(19 19) scale(.72)'>${icon}</g>
    <text class='mini-label' x='53' y='21'>${escapeXml(label)}</text>
    <text class='mini-value' x='53' y='45'>${escapeXml(value)}</text>
  </g>`;
}

function createStatsSvg(stats) {
  const streakUnit = stats.streak === 1 ? 'CONSECUTIVE DAY' : 'CONSECUTIVE DAYS';

  return `<svg width='720' height='352' viewBox='0 0 720 352' fill='none' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='title description'>
  <title id='title'>GitHub Overview for ${escapeXml(USERNAME)}</title>
  <desc id='description'>Public and private contribution totals, current contribution streak, repositories, stars, followers, and forks.</desc>
  <style>
    .name{font:650 18px 'Segoe UI',Arial,sans-serif;fill:#e7edf2}
    .handle{font:11px 'Segoe UI',Arial,sans-serif;fill:#7e8994}
    .eyebrow{font:650 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1.7px;fill:#8299ad}
    .monogram{font:700 15px 'Segoe UI',Arial,sans-serif;letter-spacing:.8px;fill:#dbe3e9}
    .section-label{font:650 9.5px 'Segoe UI',Arial,sans-serif;letter-spacing:1.3px;fill:#8795a2}
    .side-value{font:720 32px 'Segoe UI',Arial,sans-serif;fill:#e9eef2}
    .side-meta{font:9px 'Segoe UI',Arial,sans-serif;letter-spacing:.35px;fill:#70808e}
    .focus-value{font:740 36px 'Segoe UI',Arial,sans-serif;fill:#f1f4f6}
    .focus-label{font:700 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1.35px;fill:#d09a65}
    .focus-meta{font:650 8.5px 'Segoe UI',Arial,sans-serif;letter-spacing:1px;fill:#82909c}
    .mini-label{font:650 8px 'Segoe UI',Arial,sans-serif;letter-spacing:1.05px;fill:#7d8995}
    .mini-value{font:700 19px 'Segoe UI',Arial,sans-serif;fill:#e0e7ec}
    .icon{fill:none;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
    .status{font:650 8px 'Segoe UI',Arial,sans-serif;letter-spacing:1.15px;fill:#87929c}
  </style>

  <rect x='.5' y='.5' width='719' height='351' rx='16' fill='#0d1218' stroke='#303a44'/>
  <path d='M16 1h184' stroke='#7892a8' opacity='.36'/>

  <rect x='24' y='17' width='46' height='46' rx='12' fill='#18232d' stroke='#3a4854'/>
  <path d='M24 51 58 17h12v12L36 63H24Z' fill='#7892a8' opacity='.13'/>
  <text class='monogram' x='47' y='46' text-anchor='middle'>RY</text>
  <text class='eyebrow' x='84' y='28'>GITHUB OVERVIEW</text>
  <text class='name' x='84' y='50'>${escapeXml(stats.name)}</text>
  <text class='handle' x='696' y='31' text-anchor='end'>@${escapeXml(USERNAME)}</text>
  <circle cx='602' cy='51' r='3' fill='#789486'/>
  <text class='status' x='611' y='54'>PUBLIC + PRIVATE</text>

  <rect x='24' y='77' width='672' height='185' rx='15' fill='#13191f' stroke='#343e47'/>
  <path d='M226 98v142M494 98v142' stroke='#333c45'/>
  <rect x='326' y='77' width='68' height='3' rx='1.5' fill='#bf8653'/>

  <g text-anchor='middle'>
    <rect x='111' y='101' width='28' height='28' rx='8' fill='#7892a8' opacity='.13'/>
    <g class='icon' stroke='#7892a8' transform='translate(116 106) scale(.75)'>${ICONS.activity}</g>
    <text class='section-label' x='125' y='148'>TOTAL CONTRIBUTIONS</text>
    <text class='side-value' x='125' y='184'>${escapeXml(stats.totalContributions)}</text>
    <text class='side-meta' x='125' y='211'>SINCE ${FIRST_CONTRIBUTION_YEAR}</text>
    <text class='side-meta' x='125' y='228'>PUBLIC + PRIVATE ACTIVITY</text>

    <circle cx='360' cy='161' r='61' fill='#171d23' stroke='#b98251' stroke-width='4'/>
    <path d='M360 91v9M360 222v9' stroke='#b98251' stroke-width='2' stroke-linecap='round'/>
    <circle cx='360' cy='161' r='50' stroke='#343d46'/>
    <text class='focus-value' x='360' y='163'>${escapeXml(stats.contributions)}</text>
    <text class='focus-label' x='360' y='186'>CONTRIBUTIONS</text>
    <text class='focus-meta' x='360' y='244'>${escapeXml(stats.year)} ? PUBLIC + PRIVATE</text>

    <rect x='581' y='101' width='28' height='28' rx='8' fill='#7e9586' opacity='.13'/>
    <g class='icon' stroke='#7e9586' transform='translate(586 106) scale(.75)'>${ICONS.streak}</g>
    <text class='section-label' x='595' y='148'>CURRENT STREAK</text>
    <text class='side-value' x='595' y='184'>${escapeXml(stats.streak)}</text>
    <text class='side-meta' x='595' y='211'>${streakUnit}</text>
    <text class='side-meta' x='595' y='228'>CONTRIBUTION ACTIVITY</text>
  </g>

  ${compactMetric(stats.repositories, 'REPOSITORIES', 24, ICONS.repositories, '#7892a8')}
  ${compactMetric(stats.stars, 'STARS', 195, ICONS.stars, '#aa8d63')}
  ${compactMetric(stats.followers, 'FOLLOWERS', 366, ICONS.followers, '#7e9586')}
  ${compactMetric(stats.forks, 'FORKS', 537, ICONS.forks, '#9186a0')}
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
