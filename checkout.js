// Bitcoffer direct-download checkout — opens Paddle's overlay for one annual price,
// carrying the buyer's machine fingerprint so the licence can be issued and emailed
// the moment the payment clears.
//
// Three rules learned the hard way:
//   · Wait for Paddle.js to be really ready (poll), otherwise Initialize queues
//     against a stub and Checkout.open silently does nothing.
//   · Never leave a dead end: config missing, domain unapproved or an error inside
//     the overlay all fall back to the email route with an explanation.
//   · The fingerprint is required. Without it the worker can only mail a claim
//     link, and that page lives on *.workers.dev, which is unreachable from
//     mainland China — a blank field means a buyer who paid and got nothing.
//     So the page asks buyers to install the app and copy the fingerprint from
//     Settings → Licence before paying, and refuses to open the overlay without it.
(() => {
  const settings = window.bitcofferCheckout;
  const button = document.getElementById("buy");
  const status = document.getElementById("checkout-status");
  const field = document.getElementById("fingerprint");
  if (!button || !status) return;

  // Both language pages load this file; the status line follows the page language.
  const zh = /^zh/i.test(document.documentElement.lang || "");
  const M = zh
    ? {
        fallback:
          '结账打不开。请写信到 <a href="mailto:ruohuyang@163.com?subject=Bitcoffer%20licence%20fulfilment">ruohuyang@163.com</a>，我们改用发票方式收款。',
        missing:
          '请先填入机器指纹：打开 Bitcoffer → 设置 → 许可 → 机器指纹，点「复制」后粘到这里。还没装的话<a href="https://github.com/cygnusyang/bitcoffer-releases/releases/latest">先下载安装</a>——指纹只存在于你要运行它的那台 Mac 上。',
        malformed:
          '机器指纹应该是 32 位字母和数字（a-f、0-9）。请回到 Bitcoffer → 设置 → 许可 → 机器指纹 重新复制一次。',
        completed:
          '已收到付款。绑定这台 Mac 的序列号会在一分钟内寄到你付款用的邮箱；先翻一遍垃圾邮件，再来找我们。',
        warning: 'Paddle 报了一条警告，再付一次之前请先核对收据。',
        sandbox: 'Paddle 沙盒结账，请用测试卡号。',
        paid: '已付款，请查收邮件',
      }
    : {
        fallback:
          'Checkout could not open. Email <a href="mailto:ruohuyang@163.com?subject=Bitcoffer%20licence%20fulfilment">ruohuyang@163.com</a> and we will send an invoice instead.',
        missing:
          'Add your machine fingerprint first: open Bitcoffer → Settings → Licence → Machine fingerprint, press Copy, paste it here. Not installed yet? <a href="https://github.com/cygnusyang/bitcoffer-releases/releases/latest">Download and open the app</a> — the fingerprint only exists on the Mac you will run it on.',
        malformed:
          'That fingerprint should be 32 letters and numbers (a-f, 0-9). Copy it again from Bitcoffer → Settings → Licence → Machine fingerprint.',
        completed:
          'Payment received. Your licence serial is on its way to the email address you paid with — it usually lands within a minute. Check the spam folder before writing to us.',
        warning: 'Paddle reported a warning; check the receipt before paying again.',
        sandbox: 'Paddle sandbox checkout. Use test payment details.',
        paid: 'Paid — check your email',
      };

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

  let initialized = false;

  // Keep the field honest while the buyer pastes: drop separators, flag bad length.
  if (field) {
    field.addEventListener("input", () => {
      const cleaned = field.value.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
      if (cleaned !== field.value) field.value = cleaned;
      const value = readFingerprint();
      field.setAttribute("aria-invalid", value ? "false" : "true");
      if (value && initialized) sayText("");
    });
  }

  if (!settings || !/^pri_[a-z0-9]{26}$/.test(settings.priceId || "")) {
    say(M.fallback);
    return;
  }
  const sandbox = settings.environment === "sandbox";
  const tokenPattern = sandbox ? /^test_[a-z0-9]+$/ : /^live_[a-z0-9]+$/;
  if ((!sandbox && settings.environment !== "live") || !tokenPattern.test(settings.clientToken || "")) {
    say(M.fallback);
    return;
  }

  let attempts = 0;

  function initialise() {
    if (!window.Paddle || typeof window.Paddle.Initialize !== "function") {
      if (attempts++ < 60) { setTimeout(initialise, 100); return; }
      say(M.fallback);
      return;
    }
    try {
      if (sandbox) window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({
        token: settings.clientToken,
        eventCallback(event) {
          if (event.name === "checkout.loaded") sayText("");
          if (event.name === "checkout.error") say(M.fallback);
          if (event.name === "checkout.warning") sayText(M.warning);
          if (event.name === "checkout.completed") {
            say(M.completed);
            button.disabled = true;
            button.textContent = M.paid;
          }
        },
      });
      initialized = true;
      sayText(sandbox ? M.sandbox : "");
      if (readFingerprint()) field?.setAttribute("aria-invalid", "false");
      button.disabled = false;
    } catch (error) {
      say(M.fallback);
    }
  }

  button.addEventListener("click", () => {
    if (!initialized) { say(M.fallback); return; }

    const fingerprint = readFingerprint();
    if (fingerprint === "") {
      say(M.missing);
      if (field) field.focus();
      return;
    }
    if (fingerprint === null) {
      say(M.malformed);
      if (field) field.focus();
      return;
    }

    window.kTrack?.("buy_click", { p: "checkout" });
    try {
      const opening = window.Paddle.Checkout.open({
        items: [{ priceId: settings.priceId, quantity: 1 }],
        settings: { showAddDiscounts: false },
        // customData is copied onto the transaction (and onto the subscription, so
        // renewals carry it too). The licence service issues on `fingerprint`, and
        // it is always present: the field is required above.
        customData: { fingerprint, source: "site" },
      });
      if (opening && typeof opening.then === "function") {
        opening.then(() => sayText("")).catch((error) => {
          say(M.fallback + "<br><small>" + (error && error.message ? error.message : String(error)) + "</small>");
        });
      }
    } catch (error) {
      say(M.fallback + "<br><small>" + (error && error.message ? error.message : String(error)) + "</small>");
    }
  });

  initialise();
})();
