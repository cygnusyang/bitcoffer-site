# bitcoffer-site

Source and deployment for <https://bitcoffer.cygnusyang.top> — the Bitcoffer product site.

This repository is the **single source of truth** for the site. Static HTML, no build step: GitHub Pages serves the repository root, and the `CNAME` file pins the custom domain.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | English landing page (x-default) |
| `zh.html` | Simplified Chinese landing page |
| `privacy.html` / `privacy-zh.html` | Privacy policy, English and Chinese. The macOS app links here, and App Store Connect lists `https://bitcoffer.cygnusyang.top/privacy` |
| `checkout.html` / `checkout-zh.html` | Paddle checkout launcher. Carries the machine fingerprint (field or `#fp=` from the app) as Paddle `custom_data` so the licence is issued on payment |
| `claim.html` / `claim-zh.html` | Claim page: exchange a machine fingerprint for the device-bound serial, and re-send a lost licence by email |
| `guides/migrate.html` | Migration guide (Chinese): import paths, preflight report, three levels of rollback |
| `site.css`, `learn.css`, `theme.js`, `analytics.js` | Self-hosted assets. No asset is loaded from another domain |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Crawler and answer-engine entry points |
| `404.html` | Not-found page |
| `assets/og-card.png` | 1200×630 social card, referenced by `og:image` |
| `tools/og-card.html` | Source of the social card; re-render with `tools/render-og-card.sh` |
| `checkout-settings.js`, `claim-settings.js` | Public Paddle price / client token and the licence service endpoint. No secrets |

## Editing

1. Edit the HTML directly; every page is hand-written (no template engine).
2. Absolute URLs in `canonical`, `hreflang`, `og:url` and JSON-LD must point at `https://bitcoffer.cygnusyang.top/…`. Relative asset paths only.
3. Keep `hreflang` triples consistent across the page, its alternate, and `sitemap.xml`.
4. Update `lastmod` in `sitemap.xml` when page content changes.

## Deploy

```sh
git add -A && git commit -m "site: …" && git push origin main
```

GitHub Pages rebuilds on push. Verify with:

```sh
curl -sI https://bitcoffer.cygnusyang.top/ | head -1
curl -s https://bitcoffer.cygnusyang.top/ | grep -c 'bitcoffer.cygnusyang.top'
```

## History

The same three pages used to live in three places: `site/` in the private source repository, `docs/` in `cygnusyang/bitcoffer-releases` (served at `cygnusyang.github.io/bitcoffer-releases/`), and `bitcoffer/` in `cygnusyang/cygnus-website` (served at `ai.cygnusyang.top/bitcoffer/`). On 2026-11-15 they were consolidated here. The old paths keep working: marketing pages redirect, and the legal pages stay live on the old domain until the shipped app and App Store Connect point at the new one.

## Licence delivery

Payment goes through Paddle; the serial is issued and emailed automatically by
`bitcoffer-license-service` (source: `tools/license-service/` in the source repository).
`claim-settings.js` holds its public endpoint — if the Worker is renamed or moved, this
file is the only place the site needs to change.

Buyers who pay without a fingerprint get a one-click claim link instead; the claim page
posts `{token, fingerprint}` to the Worker and shows the serial immediately.

## Analytics

`analytics.js` posts `page_view` and `download_click` events to the same Cloudflare Worker the KaidoPlan site uses. No cookies, no persistent identifier; the referrer tag lives in `sessionStorage` only. The page element carries `data-site="bitcoffer"` so the Worker can attribute events to this site.
