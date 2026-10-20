import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { rehypeCallouts } from './src/plugins/rehype-callouts.mjs';

// 读取环境变量逻辑完全保留
const env = { ...loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), ''), ...process.env };
if (env.SITE_URL) {
  process.env.SITE_URL = env.SITE_URL;
}

export default defineConfig({
  // 兜底地址改成你的GitHub Pages站点地址，部署时自动生成正确的站点地图和资源路径
  site: env.SITE_URL || 'https://solitudefurina.github.io/',
  // 个人账号根域名的Pages站点，base路径直接设为根路径，完全规避静态资源404问题
  base: '/',
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  markdown: {
    processor: satteri({
      hastPlugins: [rehypeCallouts()],
    }),
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true
    }
  },
  vite: {
    server: {
      watch: {
        ignored: [' **/.obsidian/** ', ' **/_bases/** ', ' **/bases/** ', ' **/_home/** ', ' **/home/** ', ' **/_base/** ', ' **/base/** ']
      }
    },
    assetsInclude: ['**/*.base', ' **/.obsidian/** ', ' **/_bases/** ']
  }
});
