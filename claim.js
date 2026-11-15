// Bitcoffer claim page — turns the machine fingerprint into a device-bound serial.
//
// Two jobs, one page:
//   · the paid order's one-time token (from the email link) → a serial for this Mac;
//   · "I lost the email" → re-send every serial that address already has.
//
// The token travels in the fragment (#t=…), never in the query string: fragments
// are not sent to servers, so it stays out of CDN logs and Referer headers.
(() => {
  const settings = window.bitcofferClaim;
  const zh = /^zh/i.test(document.documentElement.lang || "");
  const pick = (en, cn) => (zh ? cn : en);

  const field = document.getElementById("fingerprint");
  const claimButton = document.getElementById("claim");
  const status = document.getElementById("status");
  const result = document.getElementById("result");
  const serialNode = document.getElementById("serial");
  const serialMeta = document.getElementById("serial-meta");
  const copyButton = document.getElementById("copy");
  const emailField = document.getElementById("email");
  const resendButton = document.getElementById("resend");
  const resendStatus = document.getElementById("resend-status");

  const FINGERPRINT = /^[0-9a-f]{32}$/;

  function token() {
    const match = location.hash.match(/[#&]t=([A-Za-z0-9_-]{20,64})/);
    return match ? match[1] : "";
  }

  function setStatus(text, tone) {
    if (!status) return;
    status.textContent = text;
    status.style.color = tone === "error" ? "#c0392b" : "";
  }

  const REASONS = {
    invalid_token: pick(
      "This link is not valid any more. Use the button below to have your licence emailed, or write to us.",
      "这个链接已失效。可以用下面的按钮重寄授权，或者直接写信给我们。",
    ),
    expired_token: pick(
      "This claim link has expired (they work for 30 days). Ask us to resend it and we will issue a fresh one.",
      "领取链接已过期（有效期 30 天）。写信给我们，我们重新发一份。",
    ),
    device_limit: pick(
      "This order has already reached its two-Mac limit. Write to us and we will sort it out.",
      "这张订单的可激活台数（2 台）已经用完了。写信给我们处理。",
    ),
    order_on_hold: pick(
      "This order needs a quick look before a licence can be issued. Write to us and we will finish it.",
      "这张订单需要人工核对后才能签发，写信给我们即可。",
    ),
    rate_limited: pick(
      "Too many attempts from this network. Wait a little while and try again.",
      "这个网络的尝试次数过多，请稍后再试。",
    ),
    bad_fingerprint: pick(
      "That does not look like a fingerprint. It is 32 letters and numbers.",
      "这看起来不是机器指纹——指纹是 32 位字母和数字。",
    ),
  };

  async function callClaim() {
    const raw = (field?.value || "").replace(/[^0-9a-fA-F]/g, "").toLowerCase();
    if (!FINGERPRINT.test(raw)) {
      setStatus(REASONS.bad_fingerprint, "error");
      field?.focus();
      return;
    }
    const current = token();
    if (!current) {
      setStatus(REASONS.invalid_token, "error");
      return;
    }
    claimButton.disabled = true;
    setStatus(pick("Issuing your serial…", "正在签发序列号…"));
    try {
      const response = await fetch(`${settings.endpoint}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: current, fingerprint: raw }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) {
        const reason = REASONS[body.code];
        setStatus(
          reason ||
            pick(
              "The licence server did not answer as expected. Try again in a minute.",
              "授权服务没有正常响应，请稍后再试。",
            ),
          "error",
        );
        return;
      }
      serialNode.textContent = body.serial;
      serialMeta.textContent = pick(
        `Valid until ${body.expiresAt}. ${body.devicesLeft} of ${body.totalDevices} Macs left on this order.`,
        `有效期至 ${body.expiresAt}。这张订单还剩 ${body.devicesLeft}／${body.totalDevices} 台 Mac 的额度。`,
      );
      result.style.display = "block";
      setStatus(pick("Done — the serial is also on its way by email.", "完成——序列号同时已寄到你的邮箱。"));
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      // 网络不通是最常见的一种失败（部分网络到 workers.dev 的连通性不稳定）。
      // 这时候页面不能只报一句"网络错误"，得把出路给出去：指纹已经校验过是
      // 32 位 hex，直接拼进 mailto，用户点一下就能把指纹发给我们手工签发。
      const address = (field?.value || "").replace(/[^0-9a-fA-F]/g, "").toLowerCase();
      const subject = encodeURIComponent("Bitcoffer licence claim");
      const body = encodeURIComponent(
        `Machine fingerprint: ${address}\nPaddle email: ${(emailField?.value || "").trim()}\n`,
      );
      status.innerHTML = zh
        ? `连不上授权服务（网络受限）。请把指纹发到 <a href="mailto:ruohuyang@163.com?subject=${subject}&body=${body}">ruohuyang@163.com</a>，我们手工签发。`
        : `Could not reach the licence service (network restriction). Email your fingerprint to <a href="mailto:ruohuyang@163.com?subject=${subject}&body=${body}">ruohuyang@163.com</a> and we will issue it by hand.`;
      status.style.color = "#c0392b";
    } finally {
      claimButton.disabled = false;
    }
  }

  async function callResend() {
    const email = (emailField?.value || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      resendStatus.textContent = pick("Enter the address you paid with.", "请填写付款时用的邮箱。");
      return;
    }
    resendButton.disabled = true;
    resendStatus.textContent = pick("Sending…", "正在发送…");
    try {
      const response = await fetch(`${settings.endpoint}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      resendStatus.textContent =
        response.status === 429
          ? REASONS.rate_limited
          : body.message ||
            pick("If that address has an order, the serial is on its way.", "如果这个邮箱有订单，序列号正在路上。");
    } catch (error) {
      resendStatus.textContent = pick(
        "Network error. Check your connection and try again.",
        "网络错误，请检查连接后重试。",
      );
    } finally {
      resendButton.disabled = false;
    }
  }

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(serialNode.textContent || "");
      copyButton.textContent = pick("Copied", "已复制");
      setTimeout(() => {
        copyButton.textContent = pick("Copy serial", "复制序列号");
      }, 2000);
    } catch {
      // 剪贴板被拒（无 https / 无权限）：让用户自己选，别假装复制成功。
      copyButton.textContent = pick("Select the serial above", "请手动选中上面的序列号");
    }
  });

  claimButton?.addEventListener("click", callClaim);
  resendButton?.addEventListener("click", callResend);
  field?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") callClaim();
  });

  if (!token()) {
    setStatus(
      pick(
        "This page needs the link from your licence email. If you lost it, use the form below.",
        "这个页面需要邮件里的链接。找不到邮件就填下面的表单。",
      ),
      "error",
    );
  }
})();
