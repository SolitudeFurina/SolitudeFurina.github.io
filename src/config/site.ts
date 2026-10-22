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
    provider: 'scatterleaf';
    repo: string;
    category?: string;
    theme?: 'auto' | 'light' | 'dark' | 'cream' | 'midnight' | 'slate';
    lang?: string;
    broker?: string;
    clientId?: string;
    order?: 'oldest' | 'newest';
    features?: {
      reactions?: boolean;
      skinTone?: boolean;
      sorting?: boolean;
      codeScroll?: boolean;
      preview?: boolean;
      search?: boolean;
      images?: boolean;
    };
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
    comments: false,
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
  comments: {
    enabled: false,
    provider: 'scatterleaf',
    repo: 'SolitudeFurina/SolitudeFurina.github.io',
    category: '综合',
    theme: 'auto',
    lang: 'zh',
    // 评论默认关闭：接上 ScatterLeaf（基于 GitHub Discussions）后把 enabled 改成 true
    broker: (typeof process !== 'undefined' && process.env?.PUBLIC_SCATTERLEAF_BROKER) || (import.meta as any).env?.PUBLIC_SCATTERLEAF_BROKER || '',
    features: {
      images: true
    }
  }
};
