---
title: '这个站是怎么跑起来的'
description: 'Astro + GitHub Actions + GitHub Pages 的完整链路：从 Markdown 文件到线上页面，中间到底发生了什么。'
pubDate: '2026-10-19'
tags: ['Astro', 'GitHub Pages', '建站']
---

这个站没有服务器、没有数据库，也不需要“重启服务”。它只是一堆在构建时被编译成 HTML 的文件，托管在 GitHub 的 CDN 上。

## 整条链路

```text
本地写 .md
   ↓ git push
GitHub Actions
   ↓ npm ci && npm run build
dist/  （纯静态 HTML + CSS + 少量 JS）
   ↓ upload-pages-artifact
GitHub Pages CDN
   ↓
浏览器拿到完整页面
```

关键点在于 **构建发生在 CI 里，而不是用户访问时**。所以访客第一次打开就是完整 HTML，不需要等 JavaScript 把内容画出来。

## 三个阶段

### 1. 写作：只写 Markdown

内容放在 `src/content/blog/<slug>/index.md`，目录名就是 URL：

```text
src/content/blog/hello-world/index.md  →  /blog/hello-world/
```

frontmatter 由 Zod schema 校验，字段写错（比如漏了 `description`）构建会直接失败，而不是悄悄生成一个空页面。

> [!NOTE]
> 校验是“构建时”发生的，所以错误会在 Actions 里暴露出来，不会等到上线后才发现。

### 2. 构建：Astro 预渲染

`npm run build` 会遍历 `src/pages/`，把每个路由渲染成静态 HTML。文章页用 `getStaticPaths()` 把每篇 Markdown 变成一条路由；标签页、项目页同理。

产物目录 `dist/` 的结构大致是：

```text
dist/
├── index.html
├── blog/
│   ├── index.html
│   └── hello-world/index.html
├── tags/
├── rss.xml
├── sitemap-index.xml
└── _astro/          ← 带哈希的 CSS / JS
```

### 3. 部署：只发布 dist

这一步是最容易出错的地方。GitHub Pages 有两种发布方式：

| 方式 | 结果 |
| --- | --- |
| 直接发布仓库根目录 | 会把 `package.json`、`src/` 一起暴露出去，访问 `/` 往往 404 |
| 发布 `dist/` | 只有构建产物对外，正确 |

```yaml
- uses: actions/upload-pages-artifact@v3
  with:
    path: './dist'
```

> [!WARNING]
> 如果 `path` 写成 `'.'`，Pages 会认为整个源码仓库就是网站。表现就是首页 404，但 `/package.json` 能正常打开——所有源码都成了可以被下载的静态文件。

## 为什么选静态

- **快**：没有后端查询，页面直接从 CDN 返回。
- **稳**：没有运行时，也就没有“服务挂了”这回事。
- **便宜**：公开仓库的 Pages 不收费。
- **可迁移**：产物就是普通 HTML，哪天想换托管，把 `dist/` 拷走就行。

代价是动态功能要另想办法：搜索用构建时生成的索引（本站是 `search-index.json`），评论需要接第三方服务（本站暂时关闭了评论）。

## 小结

整条链路里真正需要人做的只有一件事：**写 Markdown，然后 push**。剩下的编译和发布，交给 CI。
