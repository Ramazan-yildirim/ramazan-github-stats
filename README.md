# Ramazan GitHub cards

SVG cards for the Ramazan-yildirim profile. macOS-style window chrome, a panelled activity dashboard, language donuts and compact mobile layouts. No runtime dependencies.

## Endpoints

- `/api/stats`: a reference-inspired dashboard on the same background and panel colors as the other cards with three main panels for contributions since 2023, current streak and contributions this year. The green and amber side rings are slightly smaller than the central cyan streak ring (44px versus 64px on desktop, 27px versus 40px on mobile). The flame sits on the top of the streak ring. Three smaller icon panels below show public repos, stars and followers. Fork totals are still fetched but omitted. Ring gradients and the subtle curves behind the summary panels are decorative, not progress percentages, ranks or historical charts.
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

Replace `languages` with `stats` for the overview. Palette and layout live in `lib/cards.js`. Both cards have macOS-style red, amber and green window dots and explicit light/dark palettes. Activity shares its flat background, title-bar, panel and border colors with the other cards, while keeping colored ring gradients, a large two-color heading, system sans-serif figures, three main panels and a compact summary row. It is 720×398 on desktop and 360×414 on mobile. `ACTIVITY_THEMES` controls these colors separately from the language card. The language card retains its minimal terminal frame and adapts its height to the number of languages; its six-entry layouts are 720×320 and 360×440. Detailed metric scopes appear in each SVG's accessible description. Empty and error responses keep the simple terminal design. No external image, font or charting dependency is required.

Visual references: [GitHub Readme Stats](https://github.com/anuraghazra/github-readme-stats) for language donuts and [GitHub Readme Streak Stats](https://github.com/DenverCoder1/github-readme-streak-stats) for the three-part activity layout. These cards use the existing data-fetching logic, credentials and cache settings.
