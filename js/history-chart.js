/**
 * 게임별 금액추이 그래프 — 데스크톱(graph.js)과 웹(web-app.js) 공유.
 *
 * buildHistorySeries(rawHistory, fallbackAmount) -> [{t, y}]
 *   rawHistory: [{amount, time}, ...] (시간순). 음수(차감)는 제외하고 누적합을 만든다.
 *   fallbackAmount: 내역이 없을 때 단일 점으로 쓸 현재 금액(선택).
 *
 * renderHistoryChart(canvas, series, prevChart) -> Chart
 *   Chart.js 라인차트를 그린다. prevChart 있으면 destroy 후 재생성.
 *   (색/옵션은 데스크톱 원본 showHistoryGraph 와 동일)
 */
(function (root) {

    function buildHistorySeries(rawHistory, fallbackAmount) {
        const history = [];
        let total = 0;
        (rawHistory || []).forEach(l => {
            // 차감(음수)은 상승 그래프에서 제외
            if (l.amount < 0) return;
            total += l.amount;
            history.push({ t: l.time, y: total });
        });

        if (history.length === 0) {
            if (fallbackAmount !== undefined && fallbackAmount !== null) {
                history.push({ t: '현재', y: fallbackAmount });
            }
        } else if (history.length === 1) {
            history.unshift({ t: '시작', y: 0 });
        }
        return history;
    }

    function renderHistoryChart(canvas, series, prevChart) {
        if (typeof Chart === 'undefined' || !canvas) return prevChart || null;
        const ctx = canvas.getContext('2d');
        if (prevChart) prevChart.destroy();

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: series.map(h => (typeof h.t === 'string' && h.t.includes(' '))
                    ? [h.t.split(' ')[0], h.t.split(' ')[1]] : h.t),
                datasets: [{
                    label: '누적액',
                    data: series.map(h => h.y),
                    borderWidth: 3,
                    fill: true,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    tension: 0.1,
                    pointRadius: 4,
                    pointBorderColor: '#fff',
                    segment: { borderColor: () => '#ff4757' },
                    pointBackgroundColor: c => (c.dataIndex === 0 ? '#888' : '#ff4757'),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: { label: (c) => ` ${c.raw.toLocaleString()}원` }
                    }
                },
                scales: {
                    x: { display: true, grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
                    y: { display: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', font: { size: 11 } } }
                }
            }
        });
    }

    root.buildHistorySeries = buildHistorySeries;
    root.renderHistoryChart = renderHistoryChart;

})(typeof window !== 'undefined' ? window : globalThis);
