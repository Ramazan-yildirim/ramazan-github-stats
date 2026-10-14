export const USERNAME = 'Ramazan-yildirim';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
export const FIRST_CONTRIBUTION_YEAR = 2023;

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
    signal: AbortSignal.timeout(15000),
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

export function getDateRange(now = new Date()) {
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

export function calculateCurrentStreak(weeks) {
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

export async function getOverview() {
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
    if (!Number.isInteger(collection?.contributionCalendar?.totalContributions)) {
      throw new Error('Contribution calendar is incomplete');
    }
    return collection.contributionCalendar.totalContributions;
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

