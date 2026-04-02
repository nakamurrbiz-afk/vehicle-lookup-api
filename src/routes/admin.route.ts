import { FastifyInstance } from 'fastify';
import { config } from '../config/env';
import { clickTracker } from '../services/click-tracker.service';
import { searchTracker } from '../services/search-tracker.service';

const DAYS = 30;

// ── Auth helper ───────────────────────────────────────────────────────────────
// Read directly from process.env to avoid any module-load-order caching issues
function expectedToken(): string {
  return process.env.ADMIN_TOKEN ?? config.adminToken;
}

function checkToken(candidate: string | undefined): boolean {
  const expected = expectedToken();
  if (!expected || expected === 'change-me-before-deploying') return false;
  return typeof candidate === 'string' && candidate === expected;
}

// ── Admin data payload ────────────────────────────────────────────────────────
async function buildAdminData() {
  const [searchDaily, topVehicles, searchTotal, clickDaily, clickStats] = await Promise.all([
    searchTracker.dailyHistory(DAYS),
    searchTracker.topVehicles(15),
    searchTracker.totalAllTime(),
    clickTracker.dailyHistory(DAYS),
    clickTracker.stats(),
  ]);

  const todaySearch = searchDaily.at(-1)?.total ?? 0;
  const todayClicks = clickDaily.at(-1)?.total ?? 0;
  const totalClicks = Object.values(clickStats.total).reduce((s, v) => s + v, 0);

  return {
    meta:    { generatedAt: new Date().toISOString(), days: DAYS },
    summary: { searchTotal, todaySearch, totalClicks, todayClicks },
    searches: { daily: searchDaily, topVehicles },
    clicks:   { daily: clickDaily, bySite: clickStats.total },
  };
}

// ── Dashboard HTML ────────────────────────────────────────────────────────────
function dashboardHtml(token: string): string {
  return /* html */`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PlateCheck Admin</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:      #0f1117;
    --surface: #1a1d27;
    --border:  #2a2d3a;
    --text:    #e2e8f0;
    --muted:   #718096;
    --accent:  #6366f1;
    --green:   #10b981;
    --yellow:  #f59e0b;
    --red:     #ef4444;
  }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
  h1   { font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; }
  .subtitle { color: var(--muted); font-size: .85rem; margin-bottom: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .refresh-btn { background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: .8rem; cursor: pointer; }
  .refresh-btn:hover { opacity: .85; }

  /* Summary cards */
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .card-label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
  .card-value { font-size: 2rem; font-weight: 700; }
  .card-value.green  { color: var(--green); }
  .card-value.yellow { color: var(--yellow); }
  .card-sub { font-size: .75rem; color: var(--muted); margin-top: 4px; }

  /* Charts grid */
  .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 20px; }
  .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .chart-title { font-size: .9rem; font-weight: 600; margin-bottom: 16px; color: var(--text); }
  canvas { max-height: 280px; }

  /* Loading / error */
  #status { text-align: center; padding: 60px; color: var(--muted); }
  .error  { color: var(--red); }

  @media (max-width: 600px) { .charts { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>PlateCheck Admin</h1>
    <div class="subtitle" id="last-updated">読み込み中...</div>
  </div>
  <button class="refresh-btn" onclick="load()">更新</button>
</div>

<div id="status">データを取得中...</div>

<div id="dashboard" style="display:none">
  <div class="cards">
    <div class="card">
      <div class="card-label">累計検索数</div>
      <div class="card-value green" id="stat-search-total">—</div>
      <div class="card-sub">全期間</div>
    </div>
    <div class="card">
      <div class="card-label">本日の検索数</div>
      <div class="card-value yellow" id="stat-search-today">—</div>
      <div class="card-sub">今日</div>
    </div>
    <div class="card">
      <div class="card-label">累計クリック数</div>
      <div class="card-value green" id="stat-click-total">—</div>
      <div class="card-sub">全リスティング合計</div>
    </div>
    <div class="card">
      <div class="card-label">本日のクリック数</div>
      <div class="card-value yellow" id="stat-click-today">—</div>
      <div class="card-sub">今日</div>
    </div>
  </div>

  <div class="charts">
    <div class="chart-card">
      <div class="chart-title">日次検索数（直近 30 日）</div>
      <canvas id="chart-search-daily"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">車種別検索数 Top 15（累計）</div>
      <canvas id="chart-top-vehicles"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">中古車サイト 日次クリック数（直近 30 日）</div>
      <canvas id="chart-click-daily"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">中古車サイト別 累計クリック数</div>
      <canvas id="chart-click-by-site"></canvas>
    </div>
  </div>
</div>

<script>
const TOKEN = ${JSON.stringify(token)};
const API   = '/admin/data?token=' + encodeURIComponent(TOKEN);

const SITE_COLORS = {
  'autotrader-uk':   '#FF6B35',
  'motors-uk':       '#005EB8',
  'gumtree-uk':      '#72BF44',
  'cargurus-us':     '#00A0E9',
  'autotrader-us':   '#E4002B',
  'cars-com':        '#1B3A6B',
  'marktplaats-nl':  '#CC0000',
  'autotrack-nl':    '#4A90D9',
  'gaspedaal-nl':    '#FF6600',
  'leboncoin-fr':    '#F56B2A',
  'lacentrale-fr':   '#C8102E',
  'autoscout24-fr':  '#7B9ED9',
  'ebay_motors_uk':  '#E53238',
  'goonet-jp':       '#E60012',
  'carsensor-jp':    '#FF5500',
  'carview-jp':      '#FF0033',
};
const PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
function siteColor(id, idx) { return SITE_COLORS[id] ?? PALETTE[idx % PALETTE.length]; }

const charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

const CHART_DEFAULTS = {
  plugins: { legend: { labels: { color: '#e2e8f0', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#718096', font: { size: 10 } }, grid: { color: '#2a2d3a' } },
    y: { ticks: { color: '#718096', font: { size: 10 } }, grid: { color: '#2a2d3a' }, beginAtZero: true },
  },
};

async function load() {
  document.getElementById('status').style.display = '';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('status').className = '';
  document.getElementById('status').textContent = 'データを取得中...';

  let data;
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
  } catch (e) {
    document.getElementById('status').className = 'error';
    document.getElementById('status').textContent = 'エラー: ' + e.message;
    return;
  }

  document.getElementById('status').style.display = 'none';
  document.getElementById('dashboard').style.display = '';
  document.getElementById('last-updated').textContent =
    '最終更新: ' + new Date(data.meta.generatedAt).toLocaleString('ja-JP');

  // Summary cards
  document.getElementById('stat-search-total').textContent = data.summary.searchTotal.toLocaleString('ja-JP');
  document.getElementById('stat-search-today').textContent = data.summary.todaySearch.toLocaleString('ja-JP');
  document.getElementById('stat-click-total').textContent  = data.summary.totalClicks.toLocaleString('ja-JP');
  document.getElementById('stat-click-today').textContent  = data.summary.todayClicks.toLocaleString('ja-JP');

  // Chart 1: Daily search volume
  destroyChart('search-daily');
  charts['search-daily'] = new Chart(document.getElementById('chart-search-daily'), {
    type: 'line',
    data: {
      labels: data.searches.daily.map(r => r.date.slice(5)),  // MM-DD
      datasets: [{
        label: '検索数',
        data:  data.searches.daily.map(r => r.total),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,.15)',
        fill: true,
        tension: .35,
        pointRadius: 3,
      }],
    },
    options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } } },
  });

  // Chart 2: Top vehicles (horizontal bar)
  const vehicles = data.searches.topVehicles;
  destroyChart('top-vehicles');
  charts['top-vehicles'] = new Chart(document.getElementById('chart-top-vehicles'), {
    type: 'bar',
    data: {
      labels: vehicles.map(v => v.make + (v.model !== 'UNKNOWN' ? ' ' + v.model : '') + ' [' + v.country + ']'),
      datasets: [{
        label: '検索数',
        data:  vehicles.map(v => v.count),
        backgroundColor: vehicles.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
        borderColor:     vehicles.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ticks: { color: '#e2e8f0', font: { size: 10 } }, grid: { color: '#2a2d3a' } },
      },
    },
  });

  // Chart 3: Daily clicks by site (multi-line)
  const allSites = [...new Set(data.clicks.daily.flatMap(r => Object.keys(r.bySite)))];
  destroyChart('click-daily');
  charts['click-daily'] = new Chart(document.getElementById('chart-click-daily'), {
    type: 'line',
    data: {
      labels: data.clicks.daily.map(r => r.date.slice(5)),
      datasets: allSites.map((site, i) => ({
        label: site,
        data:  data.clicks.daily.map(r => r.bySite[site] ?? 0),
        borderColor: siteColor(site, i),
        backgroundColor: siteColor(site, i) + '22',
        tension: .35,
        pointRadius: 2,
        borderWidth: 2,
      })),
    },
    options: CHART_DEFAULTS,
  });

  // Chart 4: Total clicks by site (horizontal bar)
  const siteEntries = Object.entries(data.clicks.bySite).sort((a, b) => b[1] - a[1]);
  destroyChart('click-by-site');
  charts['click-by-site'] = new Chart(document.getElementById('chart-click-by-site'), {
    type: 'bar',
    data: {
      labels: siteEntries.map(([k]) => k),
      datasets: [{
        label: 'クリック数',
        data:  siteEntries.map(([, v]) => v),
        backgroundColor: siteEntries.map(([k], i) => siteColor(k, i) + 'cc'),
        borderColor:     siteEntries.map(([k], i) => siteColor(k, i)),
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ticks: { color: '#e2e8f0', font: { size: 11 } }, grid: { color: '#2a2d3a' } },
      },
    },
  });
}

// Auto-refresh every 60 s
load();
setInterval(load, 60_000);
</script>
</body>
</html>`;
}

type AdminQuery = { token?: string };

// ── Route registration ────────────────────────────────────────────────────────
export async function adminRoute(app: FastifyInstance): Promise<void> {
  const unauthorized = { status: 401, title: 'Unauthorized', detail: 'Valid token required' };

  // Dashboard HTML
  app.get<{ Querystring: AdminQuery }>('/dashboard', async (request, reply) => {
    const tokenFromQuery  = request.query.token;
    const tokenFromHeader = (request.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!checkToken(tokenFromQuery) && !checkToken(tokenFromHeader)) {
      return reply.status(401).header('WWW-Authenticate', 'Bearer').send(unauthorized);
    }
    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(dashboardHtml(tokenFromQuery ?? tokenFromHeader ?? ''));
  });

  // JSON data endpoint (used by the dashboard JS)
  app.get<{ Querystring: AdminQuery }>('/data', async (request, reply) => {
    const tokenFromQuery  = request.query.token;
    const tokenFromHeader = (request.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!checkToken(tokenFromQuery) && !checkToken(tokenFromHeader)) {
      return reply.status(401).send(unauthorized);
    }
    return reply.send(await buildAdminData());
  });
}
