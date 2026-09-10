# Web Citing

**中文** · [English](#english)

一个浏览器扩展：在任意网页上点一下，得到这个网页的规范引用。

A browser extension: Click on any web page to get the specification reference of that web page.

### 项目概述

网页资源已成为学术文献的重要组成部分。随着数据平台、技术文档、机构报告与预印本的主要发布渠道转向网络，参考文献中的网页条目占比持续上升。然而网页引用恰恰是著录中最繁琐的一类：与期刊论文不同，网页没有稳定的卷期页码，也缺少统一的元数据规范，著录一项引用通常需要手工查找并填写标题、责任者、发布日期、访问日期、网站名称与网址等多个字段。不同文献管理器对网页类型的字段定义亦不一致——EndNote 要求选用 Web Page 类型并单独填写访问日期，Zotero 依赖 RIS 等交换格式导入，中文期刊则普遍要求 GB/T 7714—2015 的 `[EB/OL]` 著录格式。字段缺失或格式不符会导致导入失败或引用信息错误，而此类错误在成稿后往往难以察觉。

针对上述问题，近年来出现了一批浏览器扩展工具，代表性工作包括 Citationsy – Cite Websites and Papers 与 Cite This For Me: Web Citer。这类工具通过读取页面元数据自动填充引用字段，在一定程度上减轻了著录负担，但仍存在两方面局限。其一，导出能力受限：部分工具仅提供可直接粘贴的文本或 Word 文档，未提供面向文献管理器的交换格式；部分工具虽支持此类格式，却将其置于付费档位。其二，免费额度普遍受限，对引用条数、文献表数量或导出格式设有上限，且多数工具要求注册账号、数据存储于云端。

针对这两点局限，本项目设计并实现了浏览器扩展 Web Citing，其核心特征为：

- **完全本地解析** —— 元数据全部来自页面自身声明的内容，不依赖任何后端服务，源码中不存在任何网络请求；
- **面向文献管理器的直接导出** —— 支持 RIS、EndNote、BibTeX、CSL-JSON 四种交换格式，可直接导入 Zotero、EndNote、Mendeley、NoteExpress，无需二次转录；
- **内置中英文引用样式** —— 提供 GB/T 7714—2015、APA 7th、MLA 9th、Chicago、Harvard 五种排版，可直接复制使用；
- **零账号、零费用、零数据外传** —— 无需注册，全部功能免费，用户偏好仅保存在本机。

> 上文中对第三方工具的表述基于 2026 年 9 月的公开资料，其功能与定价可能已有变化。

### 安装

1. 打开 `edge://extensions/`
2. 左下角开启「开发人员模式」
3. 点「加载解压缩的扩展」，选择本项目根目录（含 `manifest.json` 的那一层）
4. 工具栏会出现图标；建议点「显示在工具栏上」固定它

Chrome 同理，用 `chrome://extensions/`。

### 使用

点扩展图标弹出面板，自上而下三个区域：

1. **字段区** —— 自动抓取到的标题、作者、网站名、发布日期、访问日期、网址。**都能直接改**，改完下面的引用会实时更新。
2. **引用格式区** —— 选一种引用格式，下方实时显示排版结果，点「复制引用」拿走。
3. **导出区** —— 选导出格式，点「下载文件」保存，或「复制记录」直接拿原文。

在页面上**右键 →「引用本页」打开的是同一个面板**，只是省去把鼠标移到工具栏那一步。只有一个界面、一份格式状态。

面板上有两个开关，默认都是关的：

- **加检索日期** —— 给 APA / MLA / Chicago / Harvard 加上「检索于某日」。GB/T 7714 不受它控制，因为该标准强制要求引用日期。
- **同时导出摘要** —— 摘要会把网页上的原文段落复制进导出文件。标题、作者、日期是事实，摘要则是受著作权保护的表达，所以默认不导出。详见下方「法律与合规」。

设置保存在本机，不参与浏览器账号同步。

### 元数据来源

按优先级依次尝试，高优先级命中就不覆盖：

1. **JSON-LD**（`schema.org`）— `NewsArticle` / `BlogPosting` / `WebPage` 等，支持 `@graph` 嵌套
2. **OpenGraph / Twitter Card** — `og:title`、`og:site_name`、`article:published_time`
3. **Highwire** `citation_*` — 学术落地页，能带出 DOI
4. **Dublin Core** `DC.*`
5. **COinS** `span.Z3988` — 图书馆目录常用
6. **HTML 兜底** — `<title>`、`meta[name=author]`、`link[rel=canonical]`、首个 `<time datetime>`

**标题后缀剥离对所有来源生效**，不只是 `<title>` 兜底——`og:title` 常常带着同样的 `| 站点名` 后缀（Docusaurus 这类文档站就是如此）。匹配按**词元**而非字符串相等：后缀 `DeepSeek API Docs` 和域名 `api-docs.deepseek.com` 没有任何共同子串，但每个词都出现在域名里。剥掉的后缀会被采纳为站点名，比裸域名在引用里好看得多。

匹配是刻意保守的：多词后缀要求每个词都在站点词表里；单个词还要求至少 3 个字符。这样 `Climate report - BBC`（bbc.com）会被剥，而 `China - US relations`（us.com）不会——**留下站点尾巴是看得见、改得掉的，静默截断标题却不会被察觉**。

### 法律与合规

> 本节是工程视角的风险说明，**不构成法律意见**。涉及商业分发或有争议的场景请咨询律师。

**没有触及红线的地方：**

- **不规避技术措施。** 扩展只读取你浏览器里已经渲染出来的内容，不绕过付费墙、登录限制或 DRM。规避技术措施在各国都是**独立**的违法事由，与内容本身是否受保护无关——本项目不涉及。
- **不批量抓取。** 只在用户主动点击时读取**当前这一个**标签页，与手动复制粘贴没有本质区别。中国《反不正当竞争法》的相关判例（大众点评诉百度、微博诉脉脉）针对的是批量抓取并形成替代性产品，与此无关。
- **无数据传输。** 源码中不存在任何网络请求，不适用《个人信息保护法》意义上的「处理者」义务链条。
- **元数据是事实。** 标题、作者、日期、网址属于事实信息，各国著作权法只保护表达不保护事实。

**唯一的实质注意点：摘要字段。** 标题、作者、日期是事实，摘要不是——它是作者的原创表达，受著作权保护。因此本扩展**默认不导出摘要**，只有用户主动勾选后才会写入。这是刻意的设计，不是遗漏。在单个引用里附摘要是学术惯例（Zotero 等工具也这么做），出版商普遍默许，但把选择权显式交给用户，是这个项目愿意承担的边界。

**使用者的责任：**

- 导出结果的**准确性不做担保**。扩展抓取的是页面自己声明的元数据，可能缺失或错误。**投稿前请核对作者和日期。**
- 使用导出内容时，应遵守目标网站的服务条款及所在地区的法律规定。
- 如果把这些引用用进论文，误引的责任在作者，不在工具。

上架相关：隐私政策见 [docs/privacy.html](docs/privacy.html)，上架材料见 [EDGESTORE.md](EDGESTORE.md)。

### 已知限制

- **中文库**（知网、万方）页面元数据不规范，通常只能兜底到 `<title>`，需要手动补字段——面板的可编辑字段就是为此准备的
- **页面不提供作者时，EndNote 会渲染出多余的前导逗号**（`, 标题…`）。这不是导入错误，是 style 模板在渲染一个空字段——很多网页（文档站尤其）确实没有作者，EndNote 不像 CSL 那样自动用标题顶替。**解决办法是在面板里手动填作者**，比如机构名。插件不会猜——把站点名硬塞进作者位在 APA 等格式下是错的
- **SPA 站点**的 `document.title` 可能滞后于实际内容，靠 JSON-LD / OG 优先来缓解
- `meta[name=author]` 在很多新闻站存的是机构名（如「BBC News」），会被当成作者——手动改掉即可
- **GB/T 7714 的引用日期是必填的**，所以该样式始终包含访问日期，不受「加检索日期」开关影响（其余四种受该开关控制）

---

### Project Overview

Web pages have become a substantial part of the academic reference list. As data platforms, technical documentation, institutional reports and preprints increasingly appear only online, the share of web-page entries in bibliographies keeps rising. Yet web pages are the most laborious source type to cite. Unlike journal articles they have no stable volume, issue or page range, and no uniform metadata convention, so recording one reference means hunting down and typing a title, a responsible party, a publication date, an access date, a site name and a URL. Reference managers also disagree on how those fields are defined: EndNote expects the Web Page type with a separately entered access date, Zotero imports through exchange formats such as RIS, and Chinese journals generally require the `[EB/OL]` form of GB/T 7714—2015. A missing field or a mismatched format produces a failed import or an incorrect citation — and such errors are hard to notice once a manuscript is finished.

Several browser extensions have appeared in response, notably Citationsy – Cite Websites and Papers and Cite This For Me: Web Citer. By reading page metadata and filling the citation fields automatically, they ease the burden to a degree, but two limitations remain. First, export is restricted: some tools offer only text to paste or a Word document rather than a reference-manager exchange format, while others support such formats only in a paid tier. Second, free allowances are limited, capping the number of references, bibliographies or export formats, and most require an account with data held in the cloud.

Web Citing was built to address both. Its defining properties are:

- **Fully local parsing** — every field is extracted from what the page itself declares. There is no backend, and no network request exists anywhere in the source.
- **Direct export for reference managers** — RIS, EndNote, BibTeX and CSL-JSON, importing straight into Zotero, EndNote, Mendeley and NoteExpress with no retyping.
- **Built-in citation styles, Chinese and Western** — GB/T 7714—2015, APA 7th, MLA 9th, Chicago and Harvard, ready to copy.
- **No account, no fee, no data leaving the device** — nothing to sign up for, every feature free, preferences kept on your own machine.

> The description of third-party tools above reflects publicly available information as of September 2026; their features and pricing may since have changed.

### Install

1. Open `edge://extensions/`
2. Turn on **Developer mode** in the bottom-left corner
3. Click **Load unpacked** and select this project's root directory (the one containing `manifest.json`)
4. The icon appears in the toolbar — pin it for convenience

The same steps work in Chrome via `chrome://extensions/`.

### Usage

Click the extension icon to open the panel. It has three areas, top to bottom:

1. **Fields** — the title, authors, site name, publication date, access date and URL that were detected. **Every field is editable**, and the citation below updates as you type.
2. **Citation style** — pick a style and the formatted result appears immediately. Hit **Copy citation** to take it.
3. **Export** — pick a format and click **Download file**, or **Copy record** to take the raw text.

**Right-click → "Cite this page" opens the very same panel**, saving you the trip to the toolbar. One surface, one set of format state.

Two toggles sit in the panel, both off by default:

- **Retrieval date** — adds "retrieved on" to APA / MLA / Chicago / Harvard. GB/T 7714 ignores it, because that standard mandates the access date.
- **Include abstract** — the abstract copies a passage of prose from the page into the exported file. A title, an author and a date are facts; an abstract is protected expression, so it stays out unless you ask for it. See *Legal* below.

Settings are stored on your own machine and are not synced to any browser account.

### Metadata sources

Tried in priority order; a higher layer wins and is not overwritten:

1. **JSON-LD** (`schema.org`) — `NewsArticle` / `BlogPosting` / `WebPage` and friends, including `@graph` nesting
2. **OpenGraph / Twitter Card** — `og:title`, `og:site_name`, `article:published_time`
3. **Highwire** `citation_*` — publisher landing pages, and the usual route to a DOI
4. **Dublin Core** `DC.*`
5. **COinS** `span.Z3988` — common in library catalogues
6. **HTML fallbacks** — `<title>`, `meta[name=author]`, `link[rel=canonical]`, the first `<time datetime>`

**Site-suffix stripping applies to every source**, not just the `<title>` fallback — `og:title` often carries the same `| Site Name` suffix, as it does on every Docusaurus site. Matching works on **words, not string equality**: the suffix `DeepSeek API Docs` shares no substring with the host `api-docs.deepseek.com`, yet each of its words appears there. A suffix that is stripped is then adopted as the site name, which reads far better in a citation than a bare hostname.

Matching is deliberately conservative: a multi-word suffix must consist entirely of the site's own vocabulary, and a single word must be at least 3 characters. So `Climate report - BBC` (bbc.com) is trimmed while `China - US relations` (us.com) survives. **A title that keeps "| Site Name" is visible and fixable; a silently truncated title corrupts the citation unnoticed.**

### Legal

> An engineering-perspective risk note, **not legal advice**. If you plan to distribute commercially or face a dispute, consult a lawyer.

**What this extension does not do:**

- **It circumvents no technical measure.** It reads only content your browser has already rendered — no paywall, login or DRM is bypassed. Circumventing technical protection measures is an independent offence in most jurisdictions regardless of whether the content is protected, and is not involved here.
- **It does not scrape at scale.** It reads **the current tab**, only when the user asks, which is not meaningfully different from copy-paste. Anti-unfair-competition cases in China (Dianping v. Baidu, Weibo v. Maimai) concerned bulk harvesting that produced a substitute product, which is not this.
- **It transmits nothing.** No network request exists in the source, so the obligations of a "processor" under PIPL or GDPR do not attach.
- **Metadata is fact.** Titles, authors, dates and URLs are facts; copyright protects expression, not facts.

**The one substantive caveat: the abstract field.** A title, an author and a date are facts — an abstract is not. It is the author's own expression and is protected by copyright. The extension therefore **does not export abstracts by default**; that passage is written to a file only when the user ticks the box. This is deliberate design, not an oversight. Attaching an abstract to a single citation is standard scholarly practice (Zotero does it too) and publishers generally tolerate it, but handing the choice explicitly to the user is the line this project is comfortable drawing.

**The user's responsibility:**

- **No warranty of accuracy.** The extension reports what the page itself declares, which may be missing or wrong. **Verify the author and the date before you submit.**
- Comply with the terms of service of the sites you visit, and with the law where you are.
- If these citations go into a paper, a wrong citation is the author's responsibility, not the tool's.

For store submission: privacy policy at [docs/privacy.html](docs/privacy.html), listing material at [EDGESTORE.md](EDGESTORE.md).

### Known limitations

- **Chinese databases** (CNKI, Wanfang) expose irregular metadata and usually yield only a title; fill the rest in by hand — that is what the editable panel is for.
- **When a page has no author, EndNote renders a stray leading comma** (`, Title…`). This is not an import error but a style template rendering an empty field — plenty of pages, especially documentation sites, genuinely have no author, and EndNote will not substitute the title the way CSL does. **Fill the author in yourself** (an organisation name works). The extension will not guess: putting the site name in the author slot is wrong under APA and others.
- **Single-page apps** may leave `document.title` lagging behind the content; preferring JSON-LD and OpenGraph mitigates this.
- `meta[name=author]` on many news sites holds an organisation ("BBC News") and will be treated as an author — correct it by hand.
- **GB/T 7714 requires an access date**, so that style always includes one regardless of the *Retrieval date* toggle; the other four styles follow the toggle.

---

## 反馈 / Feedback

问题反馈与功能建议 / Bug reports and feature requests:
<https://github.com/Er-White/Web-Citing/issues>

---

## 许可协议 / License

Copyright (C) 2026 Xuqian Bai

本程序是自由软件：你可以依据自由软件基金会发布的 GNU 通用公共许可证（第 3 版，或你选择的任何更新版本）的条款，重新发布和/或修改它。

本程序基于「有用」的目的分发，但**不提供任何担保**，甚至不包括对适销性或特定用途适用性的默示担保。详见 GNU 通用公共许可证。

你应该已随本程序收到一份 GNU 通用公共许可证副本（见 [LICENSE](LICENSE)）；如果没有，请见 <https://www.gnu.org/licenses/>。

---

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but **WITHOUT ANY WARRANTY**; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program (see [LICENSE](LICENSE)). If not, see <https://www.gnu.org/licenses/>.
