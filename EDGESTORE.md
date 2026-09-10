# Microsoft Edge 加载项上架材料

> 上次更新：2026-09-10 · 版本 1.0.0

本文件是**上架材料的唯一出处**。提交时从这里复制，不要临场现写。
所有文案已写好，无需临场撰写；唯一还没做的准备是**截图**。

---

## 一、提交前必须准备

| 项目 | 状态 | 说明 |
|---|---|---|
| 提交包 | ✅ `web-citing-v1.0.0.zip` | `node tools/package.mjs` 生成，已用 .NET ZipFile 验证可正常读取 |
| 店标 300×300 | ✅ `store-assets/store-logo-300.png` | 由 `node tools/make-icons.mjs` 生成 |
| 截图 | ⬜ **需你自己截** | 至少 1 张，1280×800 或 640×400，最多 10 张 |
| 隐私政策 URL | ✅ `https://er-white.github.io/Web-Citing/privacy.html` | **提交前务必自己打开确认不是 404** |
| 发布者名称 | ✅ `Xuqian Bai` | 显示在商店页面上 |
| 联系邮箱 | ✅ `2512154553@qq.com` | 会公开显示；审核通知也发到这里 |
| 源码仓库 | ✅ `https://github.com/Er-White/Web-Citing` | 可填在 Support URL / Homepage URL |

### 截图拍什么

至少拍这三张，能覆盖核心功能也最能让审核员看懂：

1. **一个真实论文页面**（如 Nature 文章页）——扩展面板打开，字段已自动填好，引用格式显示 APA
2. **同一个页面的导出区**——格式下拉展开或显示 `RIS (.ris)`，鼠标指向「下载文件」
3. **一个中文网页 + GB/T 7714 格式**——证明中文场景可用

截图要能看清面板内容。不要用手机/平板样机外框。

---

## 二、商店详情

### 显示名称
<!-- 来自 manifest.json 的 __MSG_extName__，按语言自动取值，提交后只读 -->

| 语言 | 名称 |
|---|---|
| 中文（简体） | Web Citing |
| English | Web Citing |

### 简短描述
<!-- manifest.json 的 description 字段，≤132 字符，已写好 -->

- **zh_CN**：一键把当前网页导出为 RIS、EndNote、BibTeX 等文献管理器格式，并生成 GB/T 7714、APA、MLA 等常用引用文本。
- **en**：Export the current page to RIS, EndNote, BibTeX and CSL-JSON, and generate ready-to-paste citations in GB/T 7714, APA, MLA, Chicago and Harvard.

### 详细描述（中文）
<!-- Edge 要求 250–5000 字符。以下约 600 字符，可直接粘贴。 -->

```
点一下，把当前网页导出成文献管理器能导入的引用格式，并直接给出排版好的引用文本。

主要功能
· 一键读取当前网页的标题、作者、发布日期、网站名和网址，自动填入可编辑面板
· 导出 RIS、EndNote、BibTeX、CSL-JSON 四种格式，可直接导入 Zotero、EndNote、Mendeley、NoteExpress
· 直接生成 GB/T 7714-2015、APA 7th、MLA 9th、Chicago、Harvard 五种引用文本，一键复制
· 自动识别并剥离标题里的网站后缀，自动填写访问日期——引用网页时的必填项
· 所有字段都能手动修改，引用文本和导出内容实时跟着更新

使用方法
1. 打开你想引用的网页
2. 点击工具栏上的扩展图标，或在页面上右键选择「引用本页」
3. 核对面板里的信息，需要什么直接改
4. 选择引用格式复制文本，或选择导出格式下载文件

隐私
本扩展不收集、不上传任何数据，没有任何联网功能。所有处理都在你的浏览器本地完成，
设置也只保存在本机，不参与浏览器账号同步。

说明
扩展按「现状」提供，不对生成引用的准确性作担保。投稿前请自行核对作者和日期。
```

### Detailed description (English)
<!-- 250–5000 characters -->

```
Turn the page you are reading into a citation in one click — as a file your reference manager can import, or as ready-to-paste text.

What it does
· Reads the current page's title, author, publication date, site name and URL, and fills an editable panel
· Exports RIS, EndNote, BibTeX and CSL-JSON, all of which import into Zotero, EndNote, Mendeley and NoteExpress
· Produces formatted citations in GB/T 7714-2015, APA 7th, MLA 9th, Chicago and Harvard, ready to copy
· Strips the site-name suffix that pages append to their own titles, and fills in the access date — required when citing a web page
· Every field is editable, and the citation and export update as you type

How to use
1. Open the page you want to cite
2. Click the extension icon, or choose "Cite this page" from the right-click menu
3. Check the fields in the panel and correct anything that is wrong
4. Copy the citation, or pick an export format and download the file

Privacy
This extension collects nothing and transmits nothing. It has no networking code at all — everything runs locally in your browser, and your settings stay on your device.

Note
The extension is provided as is, with no warranty as to the accuracy of the citations it generates. Check the author and date before you submit.
```

### 类别
`Productivity`（生产力工具）

### 单一用途说明（Single Purpose）
<!-- Edge 的 Privacy 页要求，一句话，必须窄而具体 -->

- **zh**：读取当前网页公开的引用元数据，并生成可导入文献管理器的引用记录与格式化引用文本。
- **en**：Read the current page's public citation metadata and turn it into an importable reference record and a formatted citation.

### 支持语言
中文（简体）、English

---

## 三、权限理由

提交时每个权限都要单独填理由。**「功能需要」这类说法会被驳回**，必须说清是哪个用户可见功能在用。

| 权限 | 类型 | 理由（可直接粘贴） |
|---|---|---|
| `activeTab` | permissions | 用户点击扩展图标或右键菜单时，读取**当前这一个**标签页公开的引用元数据（标题、作者、日期、网址），用于生成引用。该授权是临时的，仅对用户主动点击的那一个标签页生效，不会在后台读取任何页面。 |
| `scripting` | permissions | 在用户点击后，将读取页面元数据的脚本注入当前标签页。注入只发生在用户主动触发的那一刻，不注册任何常驻内容脚本。 |
| `contextMenus` | permissions | 提供「引用本页」右键菜单入口。 |
| `downloads` | permissions | 将用户生成的引用记录保存为本地文件（.ris / .enw / .bib / .json）。 |
| `storage` | permissions | 在**本机**保存 4 项用户偏好：界面语言、引用格式、导出格式、是否包含检索日期、摘要开关。不使用账号同步，数据不出设备。 |
| `notifications` | permissions | 通过右键菜单导出完成后提示结果。右键路径在扩展面板之外，没有提示用户无法得知是否成功。 |
| `http://*/*`、`https://*/*` | **optional**_host_permissions | **可选权限，默认不授予，安装时不申请。** 本扩展的主要机制是 `activeTab` 临时授权；仅当浏览器拒绝临时授权时，用户在面板中主动点击「授权访问」才会申请该权限，用于在此后稳定读取网页元数据。 |

### 远程代码
**否。** 所有 JavaScript 都打包在扩展内，不从任何 CDN 或远程地址加载。

---

## 四、GitHub Pages 部署（隐私政策托管）

隐私政策已写在 [docs/privacy.html](docs/privacy.html)，`docs/` 目录可直接作为 Pages 根目录。

仓库已建好：<https://github.com/Er-White/Web-Citing>。剩下这些步骤：

1. ✅ 仓库已创建（public）
2. ⬜ 把整个项目推上去（或只推 `docs/` 目录）
3. ⬜ 仓库 → `Settings` → 左侧 `Pages`
4. ⬜ `Source` 选 `Deploy from a branch`，分支选 `main`，目录选 **`/docs`**，保存
5. ⬜ 等 1–2 分钟，访问下方 URL 确认能打开
6. ⬜ 把该 URL 填到 Edge 提交页的 Privacy policy URL

**隐私政策最终地址**：`https://er-white.github.io/Web-Citing/privacy.html`

> ⚠️ 提交前务必**自己打开一次这个 URL**。填一个 404 会被直接驳回。
> 若打不开，先确认仓库是 public、Pages 目录选的是 `/docs`、以及分支名是 `main`。
>
> ✅ `docs/privacy.html` 里的联系邮箱两处均已填为 `2512154553@qq.com`。

---

## 五、隐私披露（Edge 的 Privacy 页）

### 是否使用远程代码
`No`

### 数据使用

| 数据类型 | 是否收集 | 是否传输到设备外 |
|---|---|---|
| 个人身份信息 | 否 | 否 |
| 健康信息 | 否 | 否 |
| 财务信息 | 否 | 否 |
| 身份验证信息 | 否 | 否 |
| 个人通讯 | 否 | 否 |
| 位置 | 否 | 否 |
| 浏览历史 | 否 | 否 |
| 用户活动 | 否 | 否 |
| 网站内容 | 否 | 否 |

**说明**：扩展读取**当前页面**的公开元数据用于生成引用，处理完全在本地内存中完成，
用完即弃，不写入存储、不传输。用户偏好设置保存在 `chrome.storage.local`，
**不参与账号同步**，因此不构成 off-device 传输。

### 认证
- [x] 数据不会被出售给第三方
- [x] 数据不会用于与扩展核心功能无关的目的
- [x] 数据不会用于信用评估或借贷目的

---

## 六、给审核员的测试说明（Notes for certification）

```
无需登录，无需特殊配置。

测试步骤：
1. 在 Edge 中打开任意新闻网站的文章页（例如 https://www.bbc.com/news 下的任一报道）
2. 点击工具栏上的扩展图标
3. 面板会自动填入该页的标题、作者、日期、网站名和网址，并显示 GB/T 7714 引用文本
4. 切换「引用格式」下拉，可看到同一记录的 APA / MLA / Chicago / Harvard 排版
5. 在「导出格式」中选择 RIS，点击「下载文件」，会保存一个 .ris 文件
6. 在页面上右键 →「引用本页」，效果与点击图标相同（打开同一个面板）

关于权限：本扩展主要依赖 activeTab 临时授权，不申请任何主机权限。
面板中出现的「授权访问」按钮仅在浏览器拒绝临时授权时才会出现，
是本扩展的可选降级路径，正常流程下不会触发。

关于摘要：页面的摘要段落默认不写入导出文件（摘要为受著作权保护的表达），
用户在面板中主动勾选「同时导出摘要」后才会包含。
```

---

## 七、版本历史

| 版本 | 日期 | 变更 | 状态 |
|---|---|---|---|
| 1.0.0 | 2026-09-10 | 首次提交。RIS/ENW/BibTeX/CSL-JSON 导出，五种引用样式，中英双语，右键菜单入口 | Draft |

<!-- 状态：Draft | Submitted | In Review | Published | Rejected -->

---

## 八、审核记录

### 已知限制（用户可见，也供审核参考）

- 知网、万方等中文数据库页面元数据不规范，通常只能读到标题，其余字段需手动填写
- 页面没有作者信息时，导出记录的作者字段为空（这是页面本身就没有该信息，不是错误）
- 单页应用（SPA）的 `document.title` 可能滞后于实际内容

### 被拒记录

<!--
| 日期 | 原因 | 修复 | 重新提交 |
|------|------|------|----------|
-->
