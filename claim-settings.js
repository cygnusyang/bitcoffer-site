// Public settings for the licence claim page.
//
// Nothing secret: both endpoints are public and can only do two things without a
// valid one-time token — exchange a fingerprint for a serial that a paid order
// already authorised, or re-send an existing serial by email.
//
// Why two: `*.workers.dev` is blocked in mainland China (SNI reset, see
// docs/06-仓库拓扑与发布流程.md §7.1), so the claim page talks to a Cloudflare
// Pages function reached through `license.cygnusyang.top` — a plain CNAME from
// Aliyun DNS to the Pages project, so nothing depends on the blocked domain.
// `*.pages.dev` stays as the fallback in case the custom domain's certificate or
// DNS is the part that breaks.
window.bitcofferClaim = {
  endpoint: "https://license.cygnusyang.top",
  fallbackEndpoint: "https://bitcoffer-license.pages.dev"
};
