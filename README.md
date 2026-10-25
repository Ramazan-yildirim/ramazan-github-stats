# Ramazan GitHub cards

Minimal terminal SVG cards for the Ramazan-yildirim profile. Monospace output, a green/cyan palette, circular charts and compact mobile layouts. No runtime dependencies.

## Endpoints

- `/api/stats`: GitHub contribution calendar totals since 2023, current-year contributions and a circular current-streak highlight. The streak is the largest circle; contributions use smaller green and amber circles, while public repos, stars and followers use the smallest circles. Its flame icon sits on the top edge of the streak ring with a small background cutout, keeping the number clear. Fork totals are still fetched but omitted from the card to reduce clutter. All count outlines are decorative, not progress percentages or ranks.
- `/api/languages`: language byte totals across all owned public non-fork repositories, including archived repositories. The five largest languages are shown individually; all remaining bytes are grouped as Other. This is not a measure of proficiency or time spent.

Both routes accept `theme=dark` (default) or `theme=light` and `layout=compact` for narrow screens. Unknown values fall back to the default dark/wide presentation. Language bytes use a donut chart with a color-matched legend; the center highlights the leading language's share. All segments, including Other and tiny shares, retain their actual byte proportions. Empty data shows a neutral ring and a message.

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

Replace `languages` with `stats` for the overview. Palette and layout live in `lib/cards.js`. Both cards use a simplified terminal frame with macOS-style red, amber and green window dots, explicit dark and light palettes, and no repeated prompts, table headings or footer signature. The overview is 720×358 on desktop and 360×358 on mobile. Both layouts arrange the circles in two rows; the mobile layout reduces the contribution circles while preserving the larger streak. The language card adapts its height to the number of languages; its six-entry layouts are 720×320 and 360×440. Detailed metric scopes also appear in each SVG's accessible description. Empty and error responses keep the same terminal design. No external image, font or charting dependency is required.

Visual references: [GitHub Readme Stats](https://github.com/anuraghazra/github-readme-stats) for language donuts and [GitHub Readme Streak Stats](https://github.com/DenverCoder1/github-readme-streak-stats) for the three-part activity layout. These cards use the existing data-fetching logic, credentials and cache settings.
