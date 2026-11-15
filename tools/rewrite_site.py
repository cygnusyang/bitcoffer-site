#!/usr/bin/env python3
"""把 Bitcoffer 站点从 ai.cygnusyang.top/bitcoffer/ 迁到 bitcoffer.cygnusyang.top 根路径，
并去掉对主站的跨站资源依赖。

幂等：可重复执行，已改过的位置不会再变。
保留此文件作为迁移留痕（迁移日期 2026-11-15）。
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OLD = "https://ai.cygnusyang.top/bitcoffer/"
NEW = "https://bitcoffer.cygnusyang.top/"

# 文案里仍指向主站的共享条款页（Terms of Sale 覆盖 KaidoPlan + Bitcoffer，单一来源在 ai 站）
GLOBAL = {
    'href="/terms"': 'href="https://ai.cygnusyang.top/terms"',
    'href="/terms-zh"': 'href="https://ai.cygnusyang.top/terms-zh"',
    '"ai.cygnusyang.top"': '"bitcoffer.cygnusyang.top"',          # og:site_name
    '<meta property="og:image" content="https://bitcoffer.cygnusyang.top/assets/lock.png">':
        '<meta property="og:image" content="https://bitcoffer.cygnusyang.top/assets/og-card.png">\n'
        '<meta property="og:image:width" content="1200">\n'
        '<meta property="og:image:height" content="630">\n'
        '<meta property="og:image:alt" content="Bitcoffer — local-first password vault for macOS">',
    '<meta name="twitter:card" content="summary_large_image">':
        '<meta name="twitter:card" content="summary_large_image">\n'
        '<meta name="twitter:image" content="https://bitcoffer.cygnusyang.top/assets/og-card.png">',
    "</head>":
        '<link rel="icon" href="/assets/app-icon.png">\n'
        '<link rel="apple-touch-icon" href="/assets/app-icon.png">\n</head>',
}

# 根目录页面：跨站资源改本地自持；guides/ 下的相对路径不动
ROOT_ONLY = {
    'src="../theme.js"': 'src="theme.js"',
    'src="../kaidoplan/analytics.js"': 'src="analytics.js"',
}

# 隐私页的落盘路径已漂移（库根 ~/.bitcoffer/vaults，日志 ~/Library/Logs/）
PATH_FIX = [
    ("~/Library/Containers/top.cygnusyang.coffer/Data/Documents/Bitcoffer/&lt;vault-uuid&gt;/",
     "~/.bitcoffer/vaults/&lt;vault-uuid&gt;/"),
    ("~/Library/Containers/top.cygnusyang.coffer/Data/Documents/Bitcoffer/",
     "~/.bitcoffer/vaults/"),
    ("~/Library/Containers/top.cygnusyang.coffer/Data/Library/Logs/Bitcoffer-diag.log",
     "~/Library/Logs/Bitcoffer-diag.log"),
]


def main() -> None:
    for page in ROOT.rglob("*.html"):
        if "tools" in page.parts:
            continue
        text = page.read_text(encoding="utf-8")
        before = text
        text = text.replace(OLD, NEW)
        for old, new in GLOBAL.items():
            text = text.replace(old, new)
        if page.parent == ROOT:
            for old, new in ROOT_ONLY.items():
                text = text.replace(old, new)
        for old, new in PATH_FIX:
            text = text.replace(old, new)
        # 幂等：favicon 只插一次
        text = text.replace(
            '<link rel="icon" href="/assets/app-icon.png">\n'
            '<link rel="apple-touch-icon" href="/assets/app-icon.png">\n'
            '<link rel="icon" href="/assets/app-icon.png">\n'
            '<link rel="apple-touch-icon" href="/assets/app-icon.png">\n',
            '<link rel="icon" href="/assets/app-icon.png">\n'
            '<link rel="apple-touch-icon" href="/assets/app-icon.png">\n',
        )
        if text != before:
            page.write_text(text, encoding="utf-8")
            print(f"rewrote {page.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
