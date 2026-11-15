// Bitcoffer direct-download checkout — opens Paddle's overlay for one annual price.
//
// Two rules learned the hard way:
//   · Wait for Paddle.js to be really ready (poll), otherwise Initialize queues
//     against a stub and Checkout.open silently does nothing.
//   · Never leave a dead end: config missing, domain unapproved or an error inside
//     the overlay all fall back to the email route with an explanation.
(() => {
  const settings = window.bitcofferCheckout;
  const button = document.getElementById("buy");
  const status = document.getElementById("checkout-status");
  if (!button || !status) return;

  const fallback = 'Checkout could not open. Email <a href="mailto:ruohuyang@163.com?subject=Bitcoffer%20licence%20fulfilment">ruohuyang@163.com</a> and we will send an invoice instead.';
  const say = (html) => { status.innerHTML = html; };
  const sayText = (text) => { status.textContent = text; };

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

  window.addEventListener("error", (event) => {
    if (!status.textContent && event && event.message) say(fallback + "<br><small>" + event.message + "</small>");
  });

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
            say('Payment received. Paddle has emailed your receipt — now send the machine fingerprint from Bitcoffer&rsquo;s licence settings, plus the transaction ID, to <a href="mailto:ruohuyang@163.com?subject=Bitcoffer%20licence%20fulfilment">ruohuyang@163.com</a>.');
            button.disabled = true;
            button.textContent = "Paid — see the steps above";
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
    sayText("DEBUG: click handler ran");
    window.kTrack?.("buy_click", { p: "checkout" });
    try {
      const opening = window.Paddle.Checkout.open({
        items: [{ priceId: settings.priceId, quantity: 1 }],
        settings: { showAddDiscounts: false },
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
