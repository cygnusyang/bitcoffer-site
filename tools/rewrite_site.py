#!/usr/bin/env python3
"""一次性改写脚本：把 Bitcoffer 站点从 ai.cygnusyang.top/bitcoffer/ 迁到
bitcoffer.cygnusyang.top 根路径，并去掉对主站的跨站资源依赖。

幂等：跑第二遍不会改坏（替换目标已不存在即跳过）。保留此文件作为迁移留痕。
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OLD = "https://ai.cygnusyang.top/bitcoffer/"
NEW = "https://bitcoffer.cygnusyang.top/"

# 文案里仍指向主站的共享条款页（Terms of Sale 覆盖 KaidoPlan + Bitcoffer，单一来源在 ai 站）
SHARED_TERMS = {
    'href="/terms"': 'href="https://ai.cygnusyang.top/terms"',
    'href="/terms-zh"': 'href="https://ai.cygnusyang.top/terms-zh"',
}

# 跨站资源改本地自持
LOCAL_DEPS = {
    'src="../theme.js"': 'src="theme.js"',          # 根目录页面
    'src="../kaidoplan/analytics.js"': 'src="analytics.js"',
    '"ai.cygnusyang.top"': '"bitcoffer.cygnusyang.top"',   # og:site_name
}

# 语言互链修正（原站靠 ai 站根目录的路径约定，独立域名后必须显式指到正确文件）
LANG_FIX = {
    'index.html': [('<a class="lang" href="./" lang="zh-Hans">中文</a>',
                    '<a class="lang" href="zh" lang="zh-Hans">中文</a>')],
    'zh.html': [('<a class="lang" href="en" lang="en">EN</a>',
                 '<a class="lang" href="./" lang="en">EN</a>')],
}

# 隐私页的落盘路径已漂移（库根改为 ~/.bitcoffer/vaults，日志改为 ~/Library/Logs/）
PATH_FIX = [
    ('~/Library/Containers/top.cygnusyang.coffer/Data/Documents/Bitcoffer/&lt;vault-uuid&gt;/',
     '~/.bitcoffer/vaults/&lt;vault-uuid&gt;/'),
    ('~/Library/Containers/top.cygnusyang.coffer/Data/Library/Logs/Bitcoffer-diag.log',
     '~/Library/Logs/Bitcoffer-diag.log'),
]


def main() -> None:
    pages = [p for p in ROOT.rglob("*.html")]
    for page in pages:
        if "tools" in page.parts:
            continue
        text = page.read_text(encoding="utf-8")
        before = text
        text = text.replace(OLD, NEW)
        for old, new in {**SHARED_TERMS, **LOCAL_DEPS}.items():
            text = text.replace(old, new)
        if page.parent == ROOT:  # 根目录页面才改 theme.js 路径
            text = text.replace('src="theme.js"', 'src="theme.js"')
        for old, new in LANG_FIX.get(page.name, []) if page.parent == ROOT else []:
            text = text.replace(old, new)
        for old, new in PATH_FIX:
            text = text.replace(old, new)
        if text != before:
            page.write_text(text, encoding="utf-8")
            print(f"rewrote {page.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
