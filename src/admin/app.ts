/**
 * 博客后台（纯前端）—— 直接用 GitHub Contents API 读写仓库里的 Markdown。
 *
 * 没有服务器、没有数据库：你在页面里写的每一个字，最后都以一次 commit 的形式
 * 落到 SolitudeFurina/SolitudeFurina.github.io 仓库，GitHub Actions 重新构建、
 * Pages 自动发布。所以在手机上打开这个页面，也能完成"写文章 → 发布"。
 *
 * 安全：Personal Access Token 只存在本机 localStorage，请求直连 api.github.com。
 */

import {
  b64decode,
  b64encode,
  bytesToBase64,
  buildFrontmatter,
  escapeHtml,
  parseFrontmatter,
  renderMarkdown,
  today
} from './core';

type Article = {
  slug: string;
  path: string;
  sha: string;
  title: string;
  description: string;
  pubDate: string;
  updatedDate: string;
  tags: string[];
  draft: boolean;
  body: string;
  extra: Record<string, unknown>;
};

const KNOWN_KEYS = new Set(['title', 'description', 'pubDate', 'updatedDate', 'tags', 'draft']);

type Config = { repo: string; branch: string; token: string };

const STORE_KEY = 'blogAdmin.v1';
const API = 'https://api.github.com';

/* ────────────────────────── 小工具 ────────────────────────── */

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const els = {
  loginView: $('login-view'),
  appView: $('app-view'),
  listView: $('list-view'),
  editorView: $('editor-view'),
  repo: $<HTMLInputElement>('in-repo'),
  branch: $<HTMLInputElement>('in-branch'),
  token: $<HTMLInputElement>('in-token'),
  loginBtn: $<HTMLButtonElement>('btn-login'),
  loginMsg: $('login-msg'),
  userBadge: $('user-badge'),
  search: $<HTMLInputElement>('in-search'),
  list: $('article-list'),
  listStatus: $('list-status'),
  btnRefresh: $<HTMLButtonElement>('btn-refresh'),
  btnNew: $<HTMLButtonElement>('btn-new'),
  btnLogout: $<HTMLButtonElement>('btn-logout'),
  fTitle: $<HTMLInputElement>('f-title'),
  fSlug: $<HTMLInputElement>('f-slug'),
  fDesc: $<HTMLInputElement>('f-desc'),
  fDate: $<HTMLInputElement>('f-date'),
  fTags: $<HTMLInputElement>('f-tags'),
  fDraft: $<HTMLInputElement>('f-draft'),
  fBody: $<HTMLTextAreaElement>('f-body'),
  slugHint: $('slug-hint'),
  preview: $('preview-box'),
  tabWrite: $<HTMLButtonElement>('tab-write'),
  tabPreview: $<HTMLButtonElement>('tab-preview'),
  imgInput: $<HTMLInputElement>('in-image'),
  btnSave: $<HTMLButtonElement>('btn-save'),
  btnDelete: $<HTMLButtonElement>('btn-delete'),
  btnBack: $<HTMLButtonElement>('btn-back'),
  btnOnline: $<HTMLAnchorElement>('link-online'),
  editorTitle: $('editor-title'),
  build: $('build-status'),
  toast: $('toast')
};

let cfg: Config | null = null;
let articles: Article[] = [];
let current: Article | null = null; // null = 新建
let saving = false;
let dirty = false;

function toast(msg: string, kind: 'ok' | 'err' = 'ok', ms = 2600) {
  els.toast.textContent = msg;
  els.toast.dataset.kind = kind;
  els.toast.classList.add('show');
  window.clearTimeout((toast as any)._t);
  (toast as any)._t = window.setTimeout(() => els.toast.classList.remove('show'), ms);
}

/* ────────────────────────── 存 / 取配置 ────────────────────────── */

function loadConfig(): Config | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Config) : null;
  } catch {
    return null;
  }
}

function saveConfig(c: Config | null) {
  if (c) localStorage.setItem(STORE_KEY, JSON.stringify(c));
  else localStorage.removeItem(STORE_KEY);
  cfg = c;
}

/* ────────────────────────── GitHub API ────────────────────────── */

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function gh<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!cfg) throw new ApiError('未登录', 401);
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {})
    }
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.message) msg = `${j.message}（${res.status}）`;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const repoPath = () => `/repos/${cfg!.repo}`;

/* ────────────────────────── 读取文章列表 ────────────────────────── */

async function loadArticles() {
  els.listStatus.textContent = '正在读取仓库…';
  try {
    const tree = await gh<any>(`${repoPath()}/git/trees/${encodeURIComponent(cfg!.branch)}?recursive=1`);
    const paths: string[] = (tree.tree || [])
      .filter((n: any) => n.type === 'blob' && /^src\/content\/blog\/.+\/index\.md$/.test(n.path))
      .map((n: any) => n.path);

    const result: Article[] = [];
    const queue = [...paths];
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      for (;;) {
        const path = queue.shift();
        if (!path) return;
        try {
          const file = await gh<any>(`${repoPath()}/contents/${encodeURI(path)}?ref=${encodeURIComponent(cfg!.branch)}`);
          const raw = b64decode(file.content || '');
          const { data, body } = parseFrontmatter(raw);
          const slug = path.replace(/^src\/content\/blog\//, '').replace(/\/index\.md$/, '');
          result.push({
            slug,
            path,
            sha: file.sha,
            title: String(data.title ?? slug),
            description: String(data.description ?? ''),
            pubDate: String(data.pubDate ?? '').slice(0, 10),
            updatedDate: String(data.updatedDate ?? '').slice(0, 10),
            tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
            draft: data.draft === true,
            body: body.replace(/^\s*\n/, ''),
            extra: Object.fromEntries(Object.entries(data).filter(([k]) => !KNOWN_KEYS.has(k)))
          });
        } catch (e) {
          console.warn('读取失败', path, e);
        }
      }
    });
    await Promise.all(workers);

    articles = result.sort((a, b) => (a.pubDate < b.pubDate ? 1 : -1));
    renderList();
    els.listStatus.textContent = `${articles.length} 篇文章 · ${articles.filter((a) => a.draft).length} 篇草稿`;
  } catch (e: any) {
    els.listStatus.textContent = `读取失败：${e.message}`;
    if (e.status === 401) showLogin('令牌无效或已过期，请重新登录。');
  }
}

function renderList() {
  const kw = els.search.value.trim().toLowerCase();
  const list = articles.filter(
    (a) => !kw || a.title.toLowerCase().includes(kw) || a.slug.includes(kw) || a.tags.join(' ').toLowerCase().includes(kw)
  );
  els.list.innerHTML = '';
  if (!list.length) {
    els.list.innerHTML = `<p class="empty">${articles.length ? '没有匹配的文章' : '还没有文章，点右上角「新建」开始写。'}</p>`;
    return;
  }
  for (const a of list) {
    const row = document.createElement('button');
    row.className = 'row';
    row.type = 'button';
    row.innerHTML = `
      <span class="row-main">
        <span class="row-title">${escapeHtml(a.title)}</span>
        <span class="row-meta">${escapeHtml(a.pubDate || '无日期')} · /blog/${escapeHtml(a.slug)}/</span>
      </span>
      ${a.draft ? '<span class="pill pill-draft">草稿</span>' : '<span class="pill pill-live">已发布</span>'}
    `;
    row.addEventListener('click', () => openEditor(a));
    els.list.appendChild(row);
  }
}

/* ────────────────────────── 视图切换 ────────────────────────── */

function showLogin(msg = '') {
  els.appView.hidden = true;
  els.loginView.hidden = false;
  els.loginMsg.textContent = msg;
}

function showApp() {
  els.loginView.hidden = true;
  els.appView.hidden = false;
  showList();
}

function showList() {
  current = null;
  els.editorView.hidden = true;
  els.listView.hidden = false;
  els.search.focus({ preventScroll: true });
}

function showEditor() {
  els.listView.hidden = true;
  els.editorView.hidden = false;
  els.fBody.focus({ preventScroll: true });
}

function openEditor(a: Article | null) {
  current = a;
  els.editorTitle.textContent = a ? '编辑文章' : '新建文章';
  els.fTitle.value = a?.title ?? '';
  els.fSlug.value = a?.slug ?? `post-${today().replace(/-/g, '')}`;
  els.fSlug.disabled = !!a;
  els.fDesc.value = a?.description ?? '';
  els.fDate.value = a?.pubDate || today();
  els.fTags.value = (a?.tags ?? []).join(', ');
  els.fDraft.checked = a?.draft ?? false;
  els.fBody.value = a?.body ?? DEFAULT_BODY;
  els.btnDelete.hidden = !a;
  els.btnOnline.hidden = !a;
  if (a) els.btnOnline.href = `${siteBase()}/blog/${a.slug}/`;
  els.slugHint.textContent = a ? '目录名（slug）发布后不能改，改了就换 URL。' : '只允许小写字母、数字和短横线，会成为 /blog/该名字/。';
  els.tabWrite.classList.add('active');
  els.tabPreview.classList.remove('active');
  els.fBody.hidden = false;
  els.preview.hidden = true;
  dirty = false;
  renderPreview();
  showEditor();
}

const DEFAULT_BODY = `在这里开始写正文。

## 小标题

普通段落，**加粗**、*斜体*、\`行内代码\`。

\`\`\`bash
echo "代码块"
\`\`\`

> [!TIP]
> 提示框写法：> [!TIP] / [!NOTE] / [!WARNING]
`;

/* ────────────────────────── 预览（迷你 Markdown 渲染） ────────────────────────── */

function renderPreview() {
  els.preview.innerHTML = renderMarkdown(els.fBody.value);
}

/* ────────────────────────── 保存 / 删除 ────────────────────────── */

function readForm(): Article {
  const tags = els.fTags.value
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    slug: els.fSlug.value.trim(),
    path: '',
    sha: current?.sha ?? '',
    title: els.fTitle.value.trim(),
    description: els.fDesc.value.trim(),
    pubDate: els.fDate.value || today(),
    updatedDate: current?.updatedDate ?? '',
    tags,
    draft: els.fDraft.checked,
    body: els.fBody.value,
    extra: current?.extra ?? {}
  };
}

function validate(a: Article): string | null {
  if (!a.title) return '标题不能为空';
  if (!a.description) return '摘要不能为空（会显示在列表和搜索结果里）';
  if (!a.pubDate) return '日期不能为空';
  if (!current) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(a.slug)) return '目录名只能用「小写字母 / 数字 / 短横线」，例如 gcc-compile';
    if (articles.some((x) => x.slug === a.slug)) return '已存在同名目录，请换一个名字';
  }
  return null;
}

async function commitFile(path: string, content: string, message: string, sha?: string) {
  const body: any = { message, content: b64encode(content), branch: cfg!.branch };
  if (sha) body.sha = sha;
  return gh<any>(`${repoPath()}/contents/${encodeURI(path)}`, { method: 'PUT', body: JSON.stringify(body) });
}

async function save() {
  if (saving) return;
  const a = readForm();
  const bad = validate(a);
  if (bad) return toast(bad, 'err');

  saving = true;
  els.btnSave.disabled = true;
  els.btnSave.textContent = '提交中…';
  try {
    const path = `src/content/blog/${a.slug}/index.md`;
    const content = buildFrontmatter(a) + a.body.replace(/^\s*\n/, '');
    const message = `${current ? 'post' : 'post'}: ${a.title}`;
    const res = await commitFile(path, content, message, current?.sha);

    // slug 改过（目前 UI 里禁用，保留兜底）：新文件写好后删旧文件
    if (current && current.path !== path) {
      await gh<any>(`${repoPath()}/contents/${encodeURI(current.path)}`, {
        method: 'DELETE',
        body: JSON.stringify({ message, sha: current.sha, branch: cfg!.branch })
      });
    }

    dirty = false;
    toast(current ? '已提交，约 1–2 分钟后上线' : '文章已创建，约 1–2 分钟后上线');
    await loadArticles();
    const saved = articles.find((x) => x.slug === a.slug) || null;
    current = saved;
    if (saved) {
      els.btnDelete.hidden = false;
      els.btnOnline.hidden = false;
      els.btnOnline.href = `${siteBase()}/blog/${saved.slug}/`;
      els.editorTitle.textContent = '编辑文章';
      els.fSlug.disabled = true;
    }
    if (res?.commit?.sha) watchBuild(res.commit.sha);
  } catch (e: any) {
    toast(`提交失败：${e.message}`, 'err', 4200);
    if (e.status === 401) showLogin('令牌无权写入或已过期。');
  } finally {
    saving = false;
    els.btnSave.disabled = false;
    els.btnSave.textContent = '保存并发布';
  }
}

async function removeArticle() {
  if (!current) return;
  if (!confirm(`删除《${current.title}》？\n会从仓库删除 ${current.path}（目录里的图片不会自动删）。`)) return;
  try {
    await gh<any>(`${repoPath()}/contents/${encodeURI(current.path)}`, {
      method: 'DELETE',
      body: JSON.stringify({ message: `post: 删除 ${current.title}`, sha: current.sha, branch: cfg!.branch })
    });
    toast('已删除');
    await loadArticles();
    showList();
  } catch (e: any) {
    toast(`删除失败：${e.message}`, 'err', 4200);
  }
}

/* ────────────────────────── 图片上传 ────────────────────────── */

async function uploadImage(file: File) {
  const a = readForm();
  if (!a.slug) return toast('请先填写目录名', 'err');
  if (!current && !/^[a-z0-9][a-z0-9-]*$/.test(a.slug)) return toast('目录名不合法，无法保存图片', 'err');

  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.png').toLowerCase();
  const base = file.name
    .slice(0, file.name.length - ext.length)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const name = `${Date.now().toString(36)}${base ? '-' + base : ''}${ext}`;
  const path = `src/content/blog/${a.slug}/${name}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    toast('图片上传中…');
    await gh<any>(`${repoPath()}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `image: ${name}`,
        content: bytesToBase64(bytes),
        branch: cfg!.branch
      })
    });
    insertText(`\n![](${name})\n`);
    toast('图片已上传，已插入正文');
  } catch (e: any) {
    toast(`图片上传失败：${e.message}`, 'err', 4200);
  }
}

/* ────────────────────────── 构建状态 ────────────────────────── */

function watchBuild(sha: string) {
  const started = Date.now();
  els.build.hidden = false;
  els.build.className = 'build build-running';
  els.build.textContent = '构建中…';
  const tick = async () => {
    try {
      const runs = await gh<any>(`${repoPath()}/actions/runs?per_page=5`);
      const list: any[] = runs.workflow_runs || [];
      const run = list.find((r) => r.head_sha === sha);
      if (run && run.status === 'completed') {
        if (run.conclusion === 'success') {
          els.build.className = 'build build-ok';
          els.build.textContent = '已上线';
          els.build.title = '构建成功';
        } else {
          els.build.className = 'build build-err';
          els.build.textContent = '构建失败';
          els.build.title = run.html_url;
          toast('Actions 构建失败，点状态查看日志', 'err', 5000);
        }
        return;
      }
    } catch {
      /* 忽略，继续轮询 */
    }
    if (Date.now() - started > 5 * 60 * 1000) {
      els.build.textContent = '构建状态未知';
      return;
    }
    window.setTimeout(tick, 8000);
  };
  window.setTimeout(tick, 6000);
}

/* ────────────────────────── 编辑器工具栏 ────────────────────────── */

function insertText(text: string, wrap?: [string, string]) {
  const ta = els.fBody;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const value = ta.value;
  if (wrap) {
    const sel = value.slice(start, end) || '文字';
    ta.value = value.slice(0, start) + wrap[0] + sel + wrap[1] + value.slice(end);
    ta.selectionStart = start + wrap[0].length;
    ta.selectionEnd = start + wrap[0].length + sel.length;
  } else {
    ta.value = value.slice(0, start) + text + value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
  }
  ta.focus();
  renderPreview();
}

const TOOLS: Record<string, () => void> = {
  h2: () => insertText('\n## 小标题\n'),
  bold: () => insertText('', ['**', '**']),
  italic: () => insertText('', ['*', '*']),
  code: () => insertText('', ['`', '`']),
  block: () => insertText('\n```bash\n命令\n```\n'),
  link: () => insertText('', ['[', '](https://)']),
  quote: () => insertText('\n> [!TIP]\n> 提示内容\n'),
  list: () => insertText('\n- 条目一\n- 条目二\n'),
  table: () => insertText('\n| 列 1 | 列 2 |\n| --- | --- |\n| 值 | 值 |\n'),
  hr: () => insertText('\n---\n')
};

/* ────────────────────────── 站点地址 ────────────────────────── */

function siteBase(): string {
  // admin 在 /admin/ 下，站点根就是上一级
  return location.origin;
}

/* ────────────────────────── 事件绑定 ────────────────────────── */

function bind() {
  els.loginBtn.addEventListener('click', async () => {
    const repo = els.repo.value.trim();
    const branch = els.branch.value.trim() || 'master';
    const token = els.token.value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return (els.loginMsg.textContent = '仓库要写成 owner/name');
    if (!token) return (els.loginMsg.textContent = '请填写 Personal Access Token');

    els.loginBtn.disabled = true;
    els.loginBtn.textContent = '验证中…';
    try {
      saveConfig({ repo, branch, token });
      const me = await gh<any>('/user');
      saveConfig({ repo, branch, token });
      els.userBadge.textContent = `@${me.login}`;
      els.token.value = '';
      showApp();
      await loadArticles();
    } catch (e: any) {
      saveConfig(null);
      els.loginMsg.textContent = `登录失败：${e.message}`;
    } finally {
      els.loginBtn.disabled = false;
      els.loginBtn.textContent = '登录';
    }
  });

  els.btnLogout.addEventListener('click', () => {
    saveConfig(null);
    articles = [];
    showLogin('已退出，令牌已从本机清除。');
  });

  els.btnRefresh.addEventListener('click', () => loadArticles());
  els.btnNew.addEventListener('click', () => openEditor(null));
  els.btnBack.addEventListener('click', () => {
    showList();
    renderList();
  });
  els.search.addEventListener('input', renderList);
  els.btnSave.addEventListener('click', save);
  els.btnDelete.addEventListener('click', removeArticle);

  els.fBody.addEventListener('input', renderPreview);
  els.imgInput.addEventListener('change', () => {
    const file = els.imgInput.files?.[0];
    if (file) uploadImage(file);
    els.imgInput.value = '';
  });

  els.tabWrite.addEventListener('click', () => {
    els.tabWrite.classList.add('active');
    els.tabPreview.classList.remove('active');
    els.fBody.hidden = false;
    els.preview.hidden = true;
  });
  els.tabPreview.addEventListener('click', () => {
    els.tabPreview.classList.add('active');
    els.tabWrite.classList.remove('active');
    renderPreview();
    els.fBody.hidden = true;
    els.preview.hidden = false;
  });

  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => TOOLS[btn.dataset.tool || '']?.());
  });

  els.fSlug.addEventListener('input', () => {
    els.fSlug.value = els.fSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  });

  // 未保存就离开时提醒
  for (const el of [els.fTitle, els.fSlug, els.fDesc, els.fDate, els.fTags, els.fBody]) {
    el.addEventListener('input', () => (dirty = true));
  }
  els.fDraft.addEventListener('change', () => (dirty = true));

  window.addEventListener('beforeunload', (e) => {
    if (els.editorView.hidden || !dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

/* ────────────────────────── 启动 ────────────────────────── */

async function boot() {
  bind();
  const saved = loadConfig();
  if (!saved) return showLogin();
  cfg = saved;
  els.repo.value = saved.repo;
  els.branch.value = saved.branch;
  try {
    const me = await gh<any>('/user');
    els.userBadge.textContent = `@${me.login}`;
    showApp();
    await loadArticles();
  } catch (e: any) {
    saveConfig(null);
    showLogin(`上次的令牌已失效（${e.message}），请重新登录。`);
  }
}

void boot();
