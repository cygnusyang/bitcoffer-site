// Public settings for the licence claim page.
//
// Nothing secret: the endpoint is a public Worker URL, and it can only do two
// things without a valid one-time token — exchange a fingerprint for a serial
// that a paid order already authorised, or re-send an existing serial by email.
window.bitcofferClaim = {
  endpoint: "https://bitcoffer-license-service.cygnusyang.workers.dev"
};
