const USERNAME = "Ramazan-yildirim";

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2026-03-10",
};

if (process.env.GITHUB_TOKEN) {
  githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function githubRequest(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders,
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function getRepositories(username) {
  const repositories = [];
  let page = 1;

  while (true) {
    const repos = await githubRequest(
      `/users/${username}/repos?type=owner&sort=updated&per_page=100&page=${page}`
    );

    repositories.push(...repos);

    if (repos.length < 100) {
      break;
    }

    page++;
  }

  return repositories;
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default {
  async fetch() {
    try {
      const [user, repositories] = await Promise.all([
        githubRequest(`/users/${USERNAME}`),
        getRepositories(USERNAME),
      ]);

      // Fork olan projeleri kendi proje istatistiklerimize katmıyoruz.
      const originalRepositories = repositories.filter(
        (repository) => !repository.fork
      );

      const totalStars = originalRepositories.reduce(
        (total, repository) => total + repository.stargazers_count,
        0
      );

      const totalForks = originalRepositories.reduce(
        (total, repository) => total + repository.forks_count,
        0
      );

      const svg = `
<svg
  width="720"
  height="220"
  viewBox="0 0 720 220"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
  </defs>

  <rect
    width="720"
    height="220"
    rx="18"
    fill="url(#background)"
    stroke="#30363d"
  />

  <rect
    x="0"
    y="0"
    width="6"
    height="220"
    rx="3"
    fill="#58a6ff"
  />

  <text
    x="35"
    y="48"
    fill="#ffffff"
    font-size="24"
    font-weight="700"
    font-family="Segoe UI, Arial, sans-serif"
  >
    ${escapeXml(user.name || USERNAME)}
  </text>

  <text
    x="35"
    y="75"
    fill="#8b949e"
    font-size="14"
    font-family="Segoe UI, Arial, sans-serif"
  >
    @${escapeXml(USERNAME)}
  </text>

  <line
    x1="35"
    y1="100"
    x2="685"
    y2="100"
    stroke="#30363d"
  />

  <text x="60" y="145"
        fill="#58a6ff"
        font-size="25"
        font-weight="700"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    ${originalRepositories.length}
  </text>

  <text x="60" y="172"
        fill="#8b949e"
        font-size="13"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    Repositories
  </text>

  <text x="230" y="145"
        fill="#58a6ff"
        font-size="25"
        font-weight="700"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    ${totalStars}
  </text>

  <text x="230" y="172"
        fill="#8b949e"
        font-size="13"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    Stars
  </text>

  <text x="400" y="145"
        fill="#58a6ff"
        font-size="25"
        font-weight="700"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    ${totalForks}
  </text>

  <text x="400" y="172"
        fill="#8b949e"
        font-size="13"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    Forks
  </text>

  <text x="570" y="145"
        fill="#58a6ff"
        font-size="25"
        font-weight="700"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    ${user.followers}
  </text>

  <text x="570" y="172"
        fill="#8b949e"
        font-size="13"
        text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif">
    Followers
  </text>
</svg>`;

      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",

          // Kullanıcı tarayıcısında kalıcı cache yapma.
          "Cache-Control": "public, max-age=0, must-revalidate",

          // Vercel CDN'de 1 saat sakla.
          "Vercel-CDN-Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      const errorSvg = `
<svg width="720" height="120" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="120" rx="15" fill="#0d1117"/>
  <text
    x="30"
    y="68"
    fill="#f85149"
    font-size="18"
    font-family="Segoe UI, Arial, sans-serif"
  >
    GitHub statistics could not be loaded.
  </text>
</svg>`;

      return new Response(errorSvg, {
        status: 500,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
        },
      });
    }
  },
};