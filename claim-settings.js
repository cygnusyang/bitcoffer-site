// Public settings for the licence claim page.
//
// Nothing secret: both endpoints are public and can only do two things without a
// valid one-time token — exchange a fingerprint for a serial that a paid order
// already authorised, or re-send an existing serial by email.
//
// Why two: `*.workers.dev` is blocked in mainland China (SNI reset, see
// docs/06-仓库拓扑与发布流程.md §7.1), so the claim page talks to a Cloudflare
// Pages function that forwards to the Worker; `bitcoffer-license.pages.dev` is
// reachable there. The Worker URL stays as a fallback in case that layer is down.
window.bitcofferClaim = {
  endpoint: "https://bitcoffer-license.pages.dev",
  fallbackEndpoint: "https://bitcoffer-license-service.cygnusyang.workers.dev"
};
