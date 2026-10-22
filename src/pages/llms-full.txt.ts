// src/pages/llms-full.txt.ts
// Full markdown context feed for LLMs and RAG systems
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.toString().replace(/\/$/, '') || siteConfig.siteUrl;

  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const projects = (await getCollection('projects'))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const lines: string[] = [
    `# ${siteConfig.title} — 全文知识库`,
    `> 本站已发布文章与项目的完整汇编。`,
    `> 站点：${baseUrl}`,
    '',
        '本文件为语言模型与 AI 代理准备，可在一次请求内读到本站全部正文。',
    '',
    '---',
    '',
  ];

  for (const post of posts) {
    const postUrl = `${baseUrl}/blog/${post.id}`;
    const dateFormatted = post.data.pubDate.toISOString().split('T')[0];
    const tagsStr = post.data.tags?.join('、') || '无';

    lines.push(`## 文章：${post.data.title}`);
    lines.push(`- **链接：** ${postUrl}`);
    lines.push(`- **日期：** ${dateFormatted}`);
    lines.push(`- **作者：** ${siteConfig.author}`);
    lines.push(`- **标签：** ${tagsStr}`);
    lines.push(`- **摘要：** ${post.data.description}`);
    lines.push('');
    lines.push('### 正文');
    lines.push('');
    lines.push(post.body || post.data.description);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  for (const proj of projects) {
    const projUrl = `${baseUrl}/projects/${proj.id}`;
    const dateFormatted = proj.data.date.toISOString().split('T')[0];
    const tagsStr = proj.data.tags?.join('、') || '无';

    lines.push(`## 项目：${proj.data.title}`);
    lines.push(`- **URL:** ${projUrl}`);
    lines.push(`- **日期：** ${dateFormatted}`);
    lines.push(`- **分类：** ${proj.data.category}`);
    lines.push(`- **标签：** ${tagsStr}`);
    lines.push(`- **Description:** ${proj.data.description}`);
    if (proj.data.repoUrl) lines.push(`- **仓库：** ${proj.data.repoUrl}`);
    if (proj.data.demoUrl) lines.push(`- **在线预览：** ${proj.data.demoUrl}`);
    lines.push('');
    lines.push('### 正文');
    lines.push('');
    lines.push(proj.body || proj.data.description);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
