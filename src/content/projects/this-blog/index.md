---
title: '本站'
description: '一个用 Astro 构建的静态博客：Markdown 写作、GitHub Actions 构建、GitHub Pages 托管，零服务器零数据库。'
date: '2026-10-20'
category: '建站'
tags: ['Astro', '静态站点', 'GitHub Pages']
emoji: '🪶'
repoUrl: 'https://github.com/SolitudeFurina/SolitudeFurina.github.io'
demoUrl: 'https://solitudefurina.github.io'
featured: true
---

## 它解决什么问题

想在固定地址上长期写东西，又不想为了一篇博客维护服务器、数据库和备份。

## 怎么做的

- **构建**：Astro 在 CI 里预渲染全部页面，产物是一堆纯 HTML + CSS，客户端几乎没有 JavaScript。
- **内容**：所有文章都是 `src/content/blog/` 下的 Markdown 文件，frontmatter 由 Zod 校验，字段写错构建直接失败。
- **发布**：push 到 `master` 触发 GitHub Actions，`npm ci` → `npm run build` → 只把 `dist/` 上传到 Pages。
- **样式**：基于 Minrock 主题做了完整中文化——排版、留白、四套配色，中文字体栈单独调过。

## 值得一提的细节

- 构建前会检查 `dist/index.html` 是否存在，避免把源码目录当成网站发布。
- 搜索不依赖服务端：构建时把所有文章的标题和摘要导出成 `search-index.json`，浏览器端做匹配。
- 同时生成 `rss.xml`、`sitemap-index.xml` 和 `llms.txt`，订阅、收录和被模型读取各走各的通道。

## 代价

动态能力需要额外接服务。评论基于 GitHub Discussions，目前是关闭状态；要开的话得先部署一个转发用的 Worker。
