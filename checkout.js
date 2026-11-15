// Bitcoffer direct-download checkout — opens Paddle's overlay for one annual price,
// optionally carrying the buyer's machine fingerprint so the licence can be issued
// and emailed the moment the payment clears.
//
// Three rules learned the hard way:
//   · Wait for Paddle.js to be really ready (poll), otherwise Initialize queues
//     against a stub and Checkout.open silently does nothing.
//   · Never leave a dead end: config missing, domain unapproved or an error inside
//     the overlay all fall back to the email route with an explanation.
//   · The fingerprint field is optional but load-bearing: with it the serial arrives
//     in the same minute; without it the buyer gets a one-click claim link instead.
//     Do not make it required — a web buyer may not have installed the app yet.
(() => {
  const settings = window.bitcofferCheckout;
  const button = document.getElementById("buy");
  const status = document.getElementById("checkout-status");
  const field = document.getElementById("fingerprint");
  if (!button || !status) return;

  const fallback = 'Checkout could not open. Email <a href="mailto:ruohuyang@163.com?subject=Bitcoffer%20licence%20fulfilment">ruohuyang@163.com</a> and we will send an invoice instead.';
  const say = (html) => { status.innerHTML = html; };
  const sayText = (text) => { status.textContent = text; };

  const FINGERPRINT = /^[0-9a-f]{32}$/;

  // `#fp=<32 hex>` lets the app hand the buyer's fingerprint to this page, so the
  // in-app "buy" path needs no copy and paste at all.
  (function prefillFromHash() {
    if (!field) return;
    const match = location.hash.match(/[#&]fp=([0-9a-fA-F]{32})\b/);
    if (match) field.value = match[1].toLowerCase();
  })();

  // Returns "" when the field is empty, the 32-char fingerprint when it is valid,
  // and null when it is garbage — the caller decides how loud to be about it.
  function readFingerprint() {
    if (!field) return "";
    const cleaned = field.value.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
    if (!cleaned) return "";
    return FINGERPRINT.test(cleaned) ? cleaned : null;
  }

  if (!settings || !/^pri_[a-z0-9]{26}$/.test(settings.priceId || "")) {
    say(fallback);
    return;
  }
  const sandbox = settings.environment === "sandbox";
  const tokenPattern = sandbox ? /^test_[a-z0-9]+$/ : /^live_[a-z0-9]+$/;
  if ((!sandbox && settings.environment !== "live") || !tokenPattern.test(settings.clientToken || "")) {
    say(fallback);
    return;
  }

  let initialized = false;
  let attempts = 0;

  function initialise() {
    if (!window.Paddle || typeof window.Paddle.Initialize !== "function") {
      if (attempts++ < 60) { setTimeout(initialise, 100); return; }
      say(fallback);
      return;
    }
    try {
      if (sandbox) window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({
        token: settings.clientToken,
        eventCallback(event) {
          if (event.name === "checkout.loaded") sayText("");
          if (event.name === "checkout.error") say(fallback);
          if (event.name === "checkout.warning") sayText("Paddle reported a warning; check the receipt before paying again.");
          if (event.name === "checkout.completed") {
            const bound = readFingerprint();
            say(bound
              ? 'Payment received. Your licence serial is on its way to the email address you paid with — it usually lands within a minute. Check the spam folder before writing to us.'
              : 'Payment received. Check your inbox: a one-click link is on its way. Paste the machine fingerprint from Bitcoffer\'s licence settings there and the serial appears immediately.');
            button.disabled = true;
            button.textContent = "Paid — check your email";
          }
        },
      });
      initialized = true;
      sayText(sandbox ? "Paddle sandbox checkout. Use test payment details." : "");
      button.disabled = false;
    } catch (error) {
      say(fallback);
    }
  }

  button.addEventListener("click", () => {
    if (!initialized) { say(fallback); return; }

    const fingerprint = readFingerprint();
    if (fingerprint === null) {
      say('That fingerprint should be 32 letters and numbers (a-f, 0-9). Copy it again from Bitcoffer → Settings → Licence → Machine fingerprint, or clear the field and we will email you a link instead.');
      if (field) field.focus();
      return;
    }

    window.kTrack?.("buy_click", { p: "checkout" });
    try {
      const opening = window.Paddle.Checkout.open({
        items: [{ priceId: settings.priceId, quantity: 1 }],
        settings: { showAddDiscounts: false },
        // customData is copied onto the transaction (and onto the subscription, so
        // renewals carry it too). The licence nameserver issues on `fingerprint`.
        customData: fingerprint ? { fingerprint, source: "site" } : { source: "site" },
      });
      if (opening && typeof opening.then === "function") {
        opening.then(() => sayText("")).catch((error) => {
          say(fallback + "<br><small>" + (error && error.message ? error.message : String(error)) + "</small>");
        });
      }
    } catch (error) {
      say(fallback + "<br><small>" + (error && error.message ? error.message : String(error)) + "</small>");
    }
  });

  initialise();
})();
