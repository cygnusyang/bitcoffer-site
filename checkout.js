// Bitcoffer direct-download checkout — opens Paddle's overlay for one annual price.
//
// Failure discipline: every dead end explains itself and offers the email route,
// because a silent disabled button is worse than a manual sale.
(() => {
  const settings = window.bitcofferCheckout;
  const button = document.getElementById("buy");
  const status = document.getElementById("checkout-status");
  if (!button || !status) return;

  const fallback = 'Checkout could not open. Email <a href="mailto:ruohuyang@163.com?subject=Bitcoffer%20licence%20fulfilment">ruohuyang@163.com</a> and we will send an invoice instead.';
  const say = (html) => { status.innerHTML = html; };
  const sayText = (text) => { status.textContent = text; };

  if (!settings || !window.Paddle) {
    say(fallback);
    return;
  }
  if (!/^pri_[a-z0-9]{26}$/.test(settings.priceId || "")) {
    say(fallback);
    return;
  }
  const sandbox = settings.environment === "sandbox";
  const tokenPattern = sandbox ? /^test_[a-z0-9]+$/ : /^live_[a-z0-9]+$/;
  if ((!sandbox && settings.environment !== "live") || !tokenPattern.test(settings.clientToken || "")) {
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
  } catch (error) {
    say(fallback);
    return;
  }

  sayText(sandbox ? "Paddle sandbox checkout. Use test payment details." : "");
  button.disabled = false;
  button.addEventListener("click", () => {
    window.kTrack?.("buy_click", { p: "checkout" });
    try {
      window.Paddle.Checkout.open({ items: [{ priceId: settings.priceId, quantity: 1 }] });
    } catch (error) {
      say(fallback);
    }
  });
})();
