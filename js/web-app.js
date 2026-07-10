/**
 * 웹 랭킹 뷰어 진입점 — 데스크톱과 동일한 공유 렌더러/그래프를 사용해
 * GitHub Pages 에서 랭킹을 읽기 전용으로 표시한다.
 *
 * 데이터 출처: 같은 저장소의 data/*.json (app.py 가 publish 함)
 *   data/ranking_data.json  {data:[{name,amount,tab,memo,slug}], tabs, special_games, updated_at}
 *   data/meta.json          {today_total, updated_at}
 *   data/history/<slug>.json [{amount,time}]  (그래프용)
 */
(function () {
    'use strict';

    // 특별디자인 이미지: 데스크톱 에셋 저장소의 raw URL (base64 대신 원격 URL 주입)
    const RAW_BASE = 'https://raw.githubusercontent.com/cfnnit/cfnnit/main/imghost/goarosa/images/';
    const POLL_MS = 20000;

    const web = {
        allData: [],
        tabs: [],
        specialGames: [],
        histories: {},          // { slug: [{amount,time}, ...] } — 그래프용(메모리)
        todayTotal: 0,
        activeTab: localStorage.getItem('webActiveTab') || null,
        chart: null,
    };

    function fetchJSON(path) {
        // 캐시버스터로 CDN 캐시 우회(준실시간)
        return fetch(path + '?t=' + Date.now(), { cache: 'no-store' })
            .then(r => { if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); });
    }

    // 공유 렌더러: 웹은 에셋을 raw URL 로 리졸브, 클릭 없음, 호버 시 그래프
    const renderer = createRankingRenderer({
        resolveAsset: (f) => RAW_BASE + encodeURIComponent(f),
        specialRegistry: window.SPECIAL_GAMES,
        onRowHover: showGraph,
        onRowLeave: hideGraph,
    });

    function currentTabData() {
        const rows = web.allData.filter(it => (it.tab || web.tabs[0]) === web.activeTab);
        rows.sort((a, b) => b.amount - a.amount);
        return rows;
    }

    function renderTabs() {
        const container = document.getElementById('tabs-container');
        if (!container) return;
        container.innerHTML = '';
        web.tabs.forEach(tab => {
            const div = document.createElement('div');
            div.className = 'tab ' + (tab === web.activeTab ? 'active' : '');
            div.textContent = tab;
            div.onclick = () => {
                web.activeTab = tab;
                localStorage.setItem('webActiveTab', tab);
                renderTabs();
                renderActiveTab();
            };
            container.appendChild(div);
        });
    }

    function renderActiveTab() {
        const tbody = document.getElementById('ranking-body');
        window.specialGames = web.specialGames; // 렌더러가 슬롯 매칭에 참조
        renderer.renderRows(tbody, currentTabData(), {
            specialGames: web.specialGames,
            newChallengers: [],
        });
    }

    function setStat(id, text, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (String(el.dataset.value) === String(value)) return;
        el.dataset.value = value;
        el.textContent = text;
        el.classList.remove('stat-update');
        void el.offsetWidth;
        el.classList.add('stat-update');
    }

    function showStats() {
        const rows = currentTabData();
        const top = rows.length ? rows[0].amount : 0;
        setStat('stat-today', formatNumber(web.todayTotal) + ' 원', web.todayTotal);
        setStat('stat-count', formatNumber(web.allData.length) + ' 개', web.allData.length);
        setStat('stat-top', formatNumber(top) + ' 원', top);
    }

    // ── 그래프(호버) ─────────────────────────────────────────
    async function showGraph(e, item) {
        const modal = document.getElementById('graph-modal');
        const title = document.getElementById('graph-title');
        const canvas = document.getElementById('history-chart');
        if (!modal || !title || !canvas) return;

        title.textContent = item.name;
        modal.classList.remove('hidden');
        let posX = e.clientX + 20, posY = e.clientY + 20;
        if (posX + 520 > window.innerWidth) posX = e.clientX - 520;
        if (posY + 400 > window.innerHeight) posY = e.clientY - 400;
        modal.style.left = Math.max(10, posX) + 'px';
        modal.style.top = Math.max(10, posY) + 'px';

        // 히스토리는 rankings.json 에 함께 들어와 메모리에 있으므로 추가 fetch 불필요
        const raw = (item.slug && web.histories[item.slug]) || [];
        const series = buildHistorySeries(raw, item.amount);
        web.chart = renderHistoryChart(canvas, series, web.chart);
    }

    function hideGraph() {
        const modal = document.getElementById('graph-modal');
        if (modal) modal.classList.add('hidden');
    }

    // ── 부트 + 폴링 ──────────────────────────────────────────
    async function boot() {
        try {
            // 단일 파일만 fetch (data/rankings.json 에 랭킹·통계·히스토리 모두 포함)
            const rank = await fetchJSON('data/rankings.json');

            web.allData = rank.data || [];
            web.tabs = (rank.tabs && rank.tabs.length) ? rank.tabs : ['기본 탭'];
            web.specialGames = rank.special_games || [];
            web.histories = rank.histories || {};
            web.todayTotal = rank.today_total || 0;
            if (!web.activeTab || !web.tabs.includes(web.activeTab)) web.activeTab = web.tabs[0];

            renderTabs();
            renderActiveTab();
            showStats();

            const updated = rank.updated_at || '';
            const el = document.getElementById('web-updated');
            if (el) el.textContent = updated ? ('갱신: ' + updated.replace('T', ' ')) : '';
        } catch (err) {
            const el = document.getElementById('web-updated');
            if (el) el.textContent = '데이터를 불러오지 못했습니다.';
            console.error('[web] boot 실패:', err);
        } finally {
            setTimeout(boot, POLL_MS); // 준실시간 폴링(겹침 방지: 재귀 setTimeout)
        }
    }

    boot();
})();
