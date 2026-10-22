/**
 * Granular Feature Flags ("Complete by default, minimalist on demand")
 *
 * All flags default to `true` when omitted.
 * Minimalist or purist technical writers can set any flag to `false`
 * to completely eliminate markup, styles, and scripts during SSG build.
 */
export interface SiteFeatures {
  /** Full-text search modal + Ctrl/Cmd+K shortcuts + header triggers */
  search?: boolean;
  /** Sticky sidebar table of contents in blog posts */
  tableOfContents?: boolean;
  /** "X min read" badge in post headers */
  readingTime?: boolean;
  /** Accessible text-to-speech audio reader in blog posts and project details */
  audioPlayer?: boolean;
  /** Tag badges in post headers, article cards, and tag clouds */
  tags?: boolean;
  /** Notion-style share modal and trigger bar in blog posts */
  socialShare?: boolean;
  /** Theme toggle dropdown (White, Cream, Slate, Midnight) */
  themeSwitcher?: boolean;
  /** Floating smooth-scroll back-to-top button */
  backToTop?: boolean;
  /** Medium-style smooth image zoom modal on click */
  imageZoom?: boolean;
  /** Interactive blog comments powered by ScatterLeaf */
  comments?: boolean;
  /** Google-Translate language dropdown (off by default for a single-language site) */
  languageSelector?: boolean;
}

export interface SiteConfig {
  title: string;
  tagline: string;
  description: string;
  author: string;
  siteUrl: string;
  defaultTheme: 'white' | 'cream' | 'slate' | 'midnight';
  features?: SiteFeatures;
  socialLinks: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    email?: string;
  };
  navLinks: {
    title: string;
    href: string;
  }[];
  comments?: {
    enabled: boolean;
    /** utterances 基于 GitHub Issues，不需要自建服务；scatterleaf 基于 Discussions，要自己部署 broker */
    provider: 'utterances' | 'scatterleaf';
    /** owner/repo */
    repo: string;
    /** utterances：用哪个字段匹配已有 issue */
    issueTerm?: 'pathname' | 'url' | 'title' | 'og:title';
    /** utterances：新建 issue 时打的标签 */
    label?: string;
    /** scatterleaf 专用 */
    category?: string;
    theme?: 'auto' | 'light' | 'dark' | 'cream' | 'midnight' | 'slate';
    lang?: string;
    broker?: string;
    clientId?: string;
    order?: 'oldest' | 'newest';
  };
}

export const siteConfig: SiteConfig = {
  title: 'Solitude',
  tagline: '把零散的想法，写成可以慢慢读的文章。',
  description: '一个安静的角落。记录工程实践、阅读与生活里的想法 —— 用 Markdown 写作，静态发布，不追踪、不弹窗。',
  author: 'SolitudeFurina',
  // 生产域名：决定 canonical、OpenGraph 与 RSS 里的绝对地址
  siteUrl: (typeof process !== 'undefined' && process.env?.SITE_URL) || (import.meta as any).env?.SITE_URL || 'https://solitudefurina.github.io',
  defaultTheme: 'cream',
  // 功能开关：任意一项设为 false，构建时会连相关的 HTML 与脚本一起删掉
  features: {
    search: true,
    tableOfContents: true,
    readingTime: true,
    audioPlayer: true,
    tags: true,
    socialShare: true,
    themeSwitcher: true,
    backToTop: true,
    imageZoom: true,
    comments: true,
    languageSelector: false
  },
  socialLinks: {
    github: 'https://github.com/SolitudeFurina',
    email: '3415459400@qq.com'
  },
  navLinks: [
    { title: '首页', href: '/' },
    { title: '文章', href: '/blog' },
    { title: '项目', href: '/projects' },
    { title: '标签', href: '/tags' },
    { title: '关于', href: '/about' }
  ],
  // 评论：utterances（GitHub Issues）。仓库要装一次 utterances App，然后这里打开 enabled。
  comments: {
    enabled: true,
    provider: 'utterances',
    repo: 'SolitudeFurina/SolitudeFurina.github.io',
    issueTerm: 'pathname',
    label: '评论'
  }
};
