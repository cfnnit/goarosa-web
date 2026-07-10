/**
 * 공유 랭킹 렌더러 — 데스크톱 앱(core.js)과 웹사이트(web-app.js)가 함께 사용.
 *
 * 순위표의 "행 채우기"(순위/이름/금액 셀, 순위 구간별 클래스, 특별 비주얼)만
 * 순수하게 담당한다. 전투 연출 / FLIP 애니메이션 / 툴팁 / pywebview 호출 같은
 * 환경 의존 로직은 여기 두지 않고, 호출자가 콜백으로 주입한다.
 *
 * 의존(전역 헬퍼, state.js 에 정의): formatNumber, rowId, splitTextForImpact
 *
 * createRankingRenderer(opts) 의 opts:
 *   resolveAsset(filename) -> src|null   에셋 소스 리졸버(필수 for 특별 비주얼)
 *                                        데스크톱: downloadedAssets[f](base64)
 *                                        웹:       RAW_BASE + f (GitHub raw URL)
 *   specialRegistry        -> [cfg,...]  특별 게임 config 배열 (shared/special-games.js)
 *   onRowClick(item, tr)   -> 행 클릭 시(선택). 데스크톱은 입력폼 채우기, 웹은 생략.
 *   onRowHover(e, item)    -> 이름 셀 mouseenter(선택). 데스크톱은 툴팁/게이지, 웹은 그래프.
 *   onRowLeave(e, item)    -> 이름 셀 mouseleave(선택).
 */
(function (root) {

    // ── 순수 헬퍼 ─────────────────────────────────────────────
    function computeRankClass(rank, isLastPlace) {
        if (rank === 1) return 'rank-1';
        if (rank === 2) return 'rank-2';
        if (rank === 3) return 'rank-3';
        if (isLastPlace) return 'rank-last';
        if (rank >= 4 && rank <= 10) return 'rank-top10';
        if (rank >= 11 && rank <= 20) return 'rank-top15';
        return 'rank-minor';
    }

    function computeAmountClass(amount, rank) {
        let cls = amount < 0 ? 'amount-cell negative-amount' : 'amount-cell';
        if (rank >= 4 && rank <= 20 && amount >= 1000000) cls += ' millionaire';
        return cls;
    }

    /**
     * 순위/이름으로 특별 비주얼 config 를 찾는다. (top-3 렌더 경로에서만 호출됨)
     *   slot 매칭: 해당 슬롯이면서 그 슬롯의 special_games 게임명과 일치
     *   name 매칭: 게임명이 일치(순위 무관 — 단 이미지 렌더는 top-3 경로 한정)
     */
    function resolveSpecialVisual(rank, itemName, specialGames, registry) {
        if (!registry) return null;
        for (const cfg of registry) {
            const m = cfg.match || {};
            if (m.type === 'slot') {
                if (rank === m.slot && (specialGames || [])[m.slot - 1] === itemName) return cfg;
            } else if (m.type === 'name') {
                if (m.name === itemName) return cfg;
            }
        }
        return null;
    }

    // 특별 비주얼 config 가 필요로 하는 모든 파일명 목록
    function visualFiles(cfg) {
        if (cfg.stack) return cfg.stack.layers.map(l => l.file);
        return cfg.file ? [cfg.file] : [];
    }

    // config → 이미지 HTML (모든 파일이 resolve 될 때만; 아니면 null → 텍스트 폴백)
    function buildVisualHTML(cfg, resolveAsset) {
        const files = visualFiles(cfg);
        const srcs = files.map(f => resolveAsset(f));
        if (srcs.some(s => !s)) return null; // 하나라도 없으면 폴백
        if (cfg.stack) {
            const imgs = cfg.stack.layers.map((l, i) =>
                `<img src="${srcs[i]}" class="${cfg.cls} ${l.cls}">`).join('');
            return `<span class="${cfg.stack.wrapCls}">${imgs}</span>`;
        }
        return `<img src="${srcs[0]}" class="${cfg.cls}">`;
    }

    // ── 렌더러 팩토리 ─────────────────────────────────────────
    function createRankingRenderer(opts) {
        opts = opts || {};
        const resolveAsset = opts.resolveAsset || (() => null);
        const registry = opts.specialRegistry || root.SPECIAL_GAMES || [];
        const onRowClick = opts.onRowClick || null;
        const onRowHover = opts.onRowHover || null;
        const onRowLeave = opts.onRowLeave || null;

        /**
         * data(정렬된 배열)를 tbody 에 렌더. DOM diff 로 기존 행을 재사용한다.
         * ctx: { specialGames:[], newChallengers:[] }
         */
        function renderRows(tbody, data, ctx) {
            if (!tbody) return;
            ctx = ctx || {};
            const specialGames = ctx.specialGames || [];
            const newChallengers = ctx.newChallengers || [];

            // 사라진 행 제거
            const currentIds = data.map(item => rowId(item.name));
            Array.from(tbody.children).forEach(child => {
                if (!currentIds.includes(child.id)) tbody.removeChild(child);
            });

            data.forEach((item, index) => {
                const rank = index + 1;
                const isLastPlace = (index === data.length - 1 && data.length > 3);
                const safeId = rowId(item.name);

                let trClass = computeRankClass(rank, isLastPlace);
                if (newChallengers && newChallengers.includes(item.name)) {
                    trClass += ' row-fly-in';
                }

                let tr = document.getElementById(safeId);
                const amountClass = computeAmountClass(item.amount, rank);
                const formattedAmount = formatNumber(item.amount) + " 원";

                if (!tr) {
                    tr = document.createElement('tr');
                    tr.id = safeId;
                    tr.innerHTML = `<td class="rank-cell"></td><td class="game-name"></td><td class="${amountClass}"></td>`;
                    if (onRowClick) tr.onclick = () => onRowClick(item, tr);
                    const nameTd = tr.children[1];
                    if (onRowHover) nameTd.onmouseenter = (e) => onRowHover(e, item);
                    if (onRowLeave) nameTd.onmouseleave = (e) => onRowLeave(e, item);
                }
                if (tr.className !== trClass) tr.className = trClass;

                const rankCell = tr.children[0];
                const nameCell = tr.children[1];
                const amountCell = tr.children[2];

                if (amountCell.className !== amountClass) amountCell.className = amountClass;

                const rankStr = String(rank);

                if (rank <= 3) {
                    if (!tr.querySelector('.anim-float')) {
                        rankCell.innerHTML = '<div class="anim-float rank-text"></div>';
                        nameCell.innerHTML = '<div class="anim-float name-text"></div>';
                        amountCell.innerHTML = '<div class="anim-float amount-text"></div>';
                    }
                    const rankTxt = tr.querySelector('.rank-text');
                    const nameTxt = tr.querySelector('.name-text');
                    const amountTxt = tr.querySelector('.amount-text');

                    if (rankTxt && rankTxt.dataset.raw !== rankStr) {
                        rankTxt.replaceChildren(splitTextForImpact(rankStr));
                        rankTxt.dataset.raw = rankStr;
                    }

                    if (nameTxt) {
                        const visual = resolveSpecialVisual(rank, item.name, specialGames, registry);
                        const wantKey = visual ? (visual.marker + ':' + item.name) : '';

                        if (visual) {
                            if (nameTxt.dataset.imgKey !== wantKey) {
                                const html = buildVisualHTML(visual, resolveAsset);
                                if (html) {
                                    nameTxt.innerHTML = html;
                                    nameTxt.dataset.isImage = 'true';
                                    nameTxt.dataset.imgKey = wantKey;
                                } else {
                                    // 에셋 미도착 → 텍스트 폴백
                                    nameTxt.replaceChildren(splitTextForImpact(item.name));
                                    nameTxt.dataset.isImage = 'false';
                                    nameTxt.dataset.imgKey = '';
                                }
                                nameTxt.dataset.raw = item.name;
                            }
                            tr.dataset.specialGame = visual.marker;
                        } else {
                            if (nameTxt.dataset.isImage === 'true' || nameTxt.dataset.raw !== item.name) {
                                nameTxt.replaceChildren(splitTextForImpact(item.name));
                                nameTxt.dataset.isImage = 'false';
                                nameTxt.dataset.imgKey = '';
                                nameTxt.dataset.raw = item.name;
                            }
                            if (tr.dataset.specialGame) delete tr.dataset.specialGame;
                        }
                    }

                    if (amountTxt && amountTxt.dataset.raw !== formattedAmount) {
                        amountTxt.replaceChildren(splitTextForImpact(formattedAmount));
                        amountTxt.dataset.raw = formattedAmount;
                    }

                    if (!tr.classList.contains('top3-row')) {
                        tr.classList.add('top3-row');
                    }
                } else {
                    tr.classList.remove('top3-row');
                    if (tr.querySelector('.anim-float')) {
                        rankCell.innerHTML = '';
                        nameCell.innerHTML = '';
                        amountCell.innerHTML = '';
                    }
                    if (rankCell.textContent !== rankStr) rankCell.textContent = rankStr;
                    if (nameCell.textContent !== item.name) nameCell.textContent = item.name;
                    if (amountCell.textContent !== formattedAmount) amountCell.textContent = formattedAmount;
                }

                if (tbody.children[index] !== tr) {
                    tbody.insertBefore(tr, tbody.children[index] || null);
                }

                if (rank === 1) {
                    setTimeout(() => {
                        const text = tr.querySelector('.amount-text');
                        const cell = tr.querySelector('.amount-cell');
                        if (text && cell) {
                            const textWidth = text.offsetWidth;
                            const cellWidth = cell.offsetWidth - 40;
                            if (textWidth > cellWidth) {
                                text.style.transform = `scale(${cellWidth / textWidth})`;
                            } else {
                                text.style.transform = 'scale(1)';
                            }
                        }
                    }, 0);
                }
            });
        }

        return { renderRows };
    }

    // 공개 API
    root.createRankingRenderer = createRankingRenderer;
    root.RankingRenderHelpers = { computeRankClass, computeAmountClass, resolveSpecialVisual };

})(typeof window !== 'undefined' ? window : globalThis);
