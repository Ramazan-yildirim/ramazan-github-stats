# Ramazan GitHub cards

Linux terminal SVG cards for the Ramazan-yildirim profile. Monospace output, shell prompts, a green/cyan palette and compact mobile layouts. No runtime dependencies.

## Endpoints

- `/api/stats`: GitHub contribution calendar totals since 2023, current-year contributions, current streak, owned public non-fork repository count, stars and forks received, followers.
- `/api/languages`: language byte totals across all owned public non-fork repositories, including archived repositories. The five largest languages are shown individually; all remaining bytes are grouped as Other. This is not a measure of proficiency or time spent.

Both routes accept `theme=dark` (default) or `theme=light` and `layout=compact` for narrow screens. Unknown values fall back to the default dark/wide presentation.

## Configuration and validation

Use Node.js 24. Set `GH_TOKEN` in the server environment to a GitHub token belonging to Ramazan-yildirim. Stats requires the token. Languages can read public data without it, subject to GitHub's unauthenticated rate limit. The token is never returned to clients. Its access and GitHub visibility settings determine which contributions the calendar includes.

Run `npm test`. Tests use mocked responses, including pagination, private/fork exclusions, calendar totals, streak boundaries, missing credentials, and SVG escaping. They do not prove access to the live account's private contributions.

Contribution totals come directly from `contributionCalendar.totalContributions`. `restrictedContributionsCount` is not added to a calendar total. Streak allows a zero-contribution current day and is limited to the fetched one-year calendar window. Year boundaries use UTC, as in the original service.

The stats card is cached at the Vercel CDN for 10 minutes; the language card for 6 hours. Error images use a 60-second cache. GitHub's image proxy can add its own caching. Images return HTTP 200 even when data is unavailable so the README displays a readable error card; no synthetic values are substituted.

Data definitions: https://docs.github.com/en/graphql/reference/users

## Profile integration

Push this repository to its connected Vercel production branch to publish the terminal cards. Check both endpoints before updating the profile README.

Expected production routes after deployment:

- https://ramazan-github-stats.vercel.app/api/stats
- https://ramazan-github-stats.vercel.app/api/languages

```html
<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="https://ramazan-github-stats.vercel.app/api/languages?theme=dark&amp;layout=compact">
  <source media="(max-width: 600px)" srcset="https://ramazan-github-stats.vercel.app/api/languages?theme=light&amp;layout=compact">
  <source media="(prefers-color-scheme: dark)" srcset="https://ramazan-github-stats.vercel.app/api/languages?theme=dark">
  <source media="(prefers-color-scheme: light)" srcset="https://ramazan-github-stats.vercel.app/api/languages?theme=light">
  <img src="https://ramazan-github-stats.vercel.app/api/languages" alt="Language bytes in owned public non-fork repositories" width="720">
</picture>
```

Replace `languages` with `stats` for the overview. Palette and layout live in `lib/cards.js`. Both cards use the same terminal frame as the profile README, with explicit dark and light palettes. Empty and error responses keep the same terminal design. The original RY logo asset remains in `lib/logo.js`; the new cards use a text signature and have no external image dependency.
