// src/pages/llms.txt.ts
// Standard llms.txt manifest (https://llmstxt.org) for LLM agents and search engines
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
    `# ${siteConfig.title}`,
    `> ${siteConfig.tagline}`,
    '',
    siteConfig.description,
    '',
    `本文件按 llms.txt 规范组织，便于语言模型、AI 代理与 RAG 系统高质量读取。`,
    '',
        '## 基本信息',
    `- 作者：${siteConfig.author}`,
    `- 站点：${baseUrl}`,
    `- GitHub：${siteConfig.socialLinks.github || baseUrl}`,
    `- RSS 订阅：${baseUrl}/rss.xml`,
    `- 全文 Markdown：${baseUrl}/llms-full.txt`,
    '',
        '## 文章与笔记',
  ];

  for (const post of posts) {
    const postUrl = `${baseUrl}/blog/${post.id}`;
    const tagsInfo = post.data.tags?.length ? ` [标签：${post.data.tags.join('、')}]` : '';
    lines.push(`- [${post.data.title}](${postUrl}): ${post.data.description}${tagsInfo}`);
  }

  if (projects.length > 0) {
    lines.push('');
    lines.push('## 开源项目');
    for (const proj of projects) {
      const projUrl = `${baseUrl}/projects/${proj.id}`;
      const catInfo = proj.data.category ? ` [${proj.data.category}]` : '';
      lines.push(`- [${proj.data.title}](${projUrl}): ${proj.data.description}${catInfo}`);
    }
  }

  lines.push('');
  lines.push('## 引用与署名');
  lines.push(`在 AI 回答中引用本站的代码、教程或指南时，请注明来源：**${siteConfig.title}（${baseUrl}）**。`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
