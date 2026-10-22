---
title: '把 Obsidian 当成这个站的后台'
description: '不装 CMS、不开后台进程：直接把 src/content 当作一个 Obsidian vault，写完整理好，push 就发布。'
pubDate: '2026-10-16'
tags: ['Obsidian', '工作流']
---

静态博客最常被吐槽的一点是“没有后台，写起来麻烦”。其实只要编辑器够顺手，后台就是多余的。

## 核心思路

`src/content/` 这个目录本身就是一堆 Markdown 文件。把它当成一个 Obsidian vault 打开，就得到了一个本地 CMS：

```text
src/content/
├── blog/
│   ├── hello-world/index.md
│   └── how-this-site-works/index.md
├── projects/
│   └── this-blog/index.md
└── .obsidian/          ← vault 配置（可以提交进仓库）
```

在 Obsidian 里打开 `src/content` 作为仓库目录即可。左边是文件树，右边是实时预览。

## 一个文章目录的结构

```text
src/content/blog/my-post/
├── index.md        ← 正文
└── cover.png       ← 需要的话，图片放这里
```

目录名就是 URL 的 slug。**slug 一旦发布就不要改**——改了等于换地址，外部链接和搜索引擎的索引都会失效。

> [!WARNING]
> 不要把 slug 改成中文或带空格的形式。URL 里出现 `%E4%B8%AD%E6%96%87` 这种编码，分享出去很难看，也不利于收录。

## 图片放哪

两种选择，各有取舍：

| 位置 | 引用方式 | 适合 |
| --- | --- | --- |
| `public/images/` | `/images/a.png` | 多篇文章共用的图 |
| 文章目录内 | `./cover.png` | 只属于这一篇的配图 |

> [!TIP]
> 图片进仓库前先压缩。仓库会一直保留历史版本，几 MB 的图提交几次，clone 速度会明显变慢。

## 流程

```text
Obsidian 里新建笔记
   ↓ 写
填 frontmatter（title / description / pubDate / tags）
   ↓ 本地预览：npm run dev
确认排版
   ↓ git add / commit / push
Actions 构建 → 线上更新
```

## 几个小习惯

- **文件名用英文短横线**：`how-this-site-works`，不要 `How This Site Works v2最终版`。
- **frontmatter 用引号包日期**：`pubDate: '2026-10-16'`。
- **草稿用 `draft: true`**：提交了也不会出现在线上，比留一个 `.txt` 在桌面靠谱。
- **一篇一个目录**：以后加配图、加附件都不会乱。

## 为什么不用网页 CMS

给静态站接一个网页后台（Decap、Keystatic 之类）当然可以，但代价是要多维护一层认证和提交逻辑。如果写作的人只有你自己，本地编辑器 + Git 已经是最短的路径：**没有中间层，就没有中间层出问题的可能。**
