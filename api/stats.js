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
        `commits${year}: contributionsCollection(from: $commits${year}From, to: $commits${year}To) {
          totalCommitContributions
          contributionCalendar { totalContributions }
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
  const currentYearContributions =
    data.user[`commits${dateRange.year}`]?.contributionCalendar
      ?.totalContributions || 0;

  return {
    name: data.user.name || USERNAME,
    repositories: data.user.repositories.totalCount,
    stars: totals.stars,
    followers: data.user.followers.totalCount,
    forks: totals.forks,
    contributions: currentYearContributions,
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

function compactMetric(value, label, x, icon, accent) {
  return `<g transform='translate(${x} 275)'>
    <rect width='30' height='30' y='3' rx='7' fill='${accent}' opacity='.13'/>
    <g class='icon' stroke='${accent}' transform='translate(6 9) scale(.72)'>${icon}</g>
    <text class='mini-label' x='40' y='13'>${escapeXml(label)}</text>
    <text class='mini-value' x='40' y='38'>${escapeXml(value)}</text>
  </g>`;
}

function createStatsSvg(stats) {
  const streakUnit = stats.streak === 1 ? 'CONSECUTIVE DAY' : 'CONSECUTIVE DAYS';

  return `<svg width='720' height='344' viewBox='0 0 720 344' fill='none' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='title description'>
  <title id='title'>GitHub Overview for ${escapeXml(USERNAME)}</title>
  <desc id='description'>Repositories, stars, followers, forks, yearly contributions, total commits, and current contribution streak.</desc>
  <style>
    .name{font:650 18px 'Segoe UI',Arial,sans-serif;fill:#e6edf3}
    .handle{font:11px 'Segoe UI',Arial,sans-serif;fill:#7f8994}
    .eyebrow{font:650 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1.65px;fill:#8298aa}
    .monogram{font:700 15px 'Segoe UI',Arial,sans-serif;letter-spacing:.8px;fill:#d6dee5}
    .section-label{font:650 10px 'Segoe UI',Arial,sans-serif;letter-spacing:1.35px;fill:#8c97a2}
    .side-value{font:700 34px 'Segoe UI',Arial,sans-serif;fill:#e7edf2}
    .side-meta{font:10px 'Segoe UI',Arial,sans-serif;fill:#6f7a85}
    .focus-value{font:720 31px 'Segoe UI',Arial,sans-serif;fill:#f0f3f5}
    .focus-label{font:650 9px 'Segoe UI',Arial,sans-serif;letter-spacing:1.2px;fill:#c99663}
    .focus-year{font:11px 'Segoe UI',Arial,sans-serif;fill:#7f8993}
    .mini-label{font:650 8px 'Segoe UI',Arial,sans-serif;letter-spacing:1px;fill:#77828d}
    .mini-value{font:680 19px 'Segoe UI',Arial,sans-serif;fill:#dce3e8}
    .icon{fill:none;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
    .status{font:650 8px 'Segoe UI',Arial,sans-serif;letter-spacing:1.15px;fill:#84909b}
  </style>
  <rect x='.5' y='.5' width='719' height='343' rx='15' fill='#0d1117' stroke='#303842'/>

  <rect x='24' y='18' width='44' height='44' rx='11' fill='#18212a' stroke='#3a4651'/>
  <path d='M24 50 56 18h12v12L36 62H24Z' fill='#7892a8' opacity='.12'/>
  <text class='monogram' x='46' y='46' text-anchor='middle'>RY</text>
  <text class='eyebrow' x='82' y='28'>GITHUB ACTIVITY</text>
  <text class='name' x='82' y='49'>${escapeXml(stats.name)}</text>
  <text class='handle' x='696' y='35' text-anchor='end'>@${escapeXml(USERNAME)}</text>
  <circle cx='612' cy='53' r='3' fill='#789486'/>
  <text class='status' x='621' y='56'>GITHUB DATA</text>

  <rect x='24' y='78' width='672' height='174' rx='14' fill='#13181e' stroke='#333b44'/>
  <rect x='318' y='78' width='84' height='3' rx='1.5' fill='#b98050'/>
  <path d='M214 98v134M506 98v134' stroke='#353d45'/>

  <g text-anchor='middle'>
    <g class='icon' stroke='#7892a8' transform='translate(107 104) scale(.72)'>${ICONS.commits}</g>
    <text class='section-label' x='119' y='135'>TOTAL COMMITS</text>
    <text class='side-value' x='119' y='176'>${escapeXml(stats.totalCommits)}</text>
    <text class='side-meta' x='119' y='205'>COUNTED SINCE ${FIRST_COMMIT_YEAR}</text>

    <circle cx='360' cy='151' r='54' stroke='#303840' stroke-width='7'/>
    <circle cx='360' cy='151' r='54' stroke='#b98050' stroke-width='3'/>
    <circle cx='360' cy='97' r='5' fill='#13181e' stroke='#c48a55' stroke-width='3'/>
    <text class='focus-value' x='360' y='153'>${escapeXml(stats.contributions)}</text>
    <text class='focus-label' x='360' y='175'>CONTRIBUTIONS</text>
    <text class='focus-year' x='360' y='226'>${escapeXml(stats.year)} ACTIVITY</text>

    <g class='icon' stroke='#7e9586' transform='translate(589 104) scale(.72)'>${ICONS.streak}</g>
    <text class='section-label' x='601' y='135'>CURRENT STREAK</text>
    <text class='side-value' x='601' y='176'>${escapeXml(stats.streak)}</text>
    <text class='side-meta' x='601' y='205'>${streakUnit}</text>
  </g>

  <rect x='24' y='264' width='672' height='62' rx='12' fill='#11161c' stroke='#303841'/>
  <path d='M192 276v38M360 276v38M528 276v38' stroke='#2d353d'/>
  ${compactMetric(stats.repositories, 'REPOSITORIES', 42, ICONS.repositories, '#7892a8')}
  ${compactMetric(stats.stars, 'STARS', 210, ICONS.stars, '#a88b62')}
  ${compactMetric(stats.followers, 'FOLLOWERS', 378, ICONS.followers, '#7e9586')}
  ${compactMetric(stats.forks, 'FORKS', 546, ICONS.forks, '#9186a0')}
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
