/**
 * 특별 디자인(special games) 레지스트리 — 데스크톱 앱과 웹사이트가 공유.
 *
 * 이 파일 하나만 고치면 데스크톱/웹 양쪽에 특별 게임 비주얼이 동시에 반영된다.
 * (CSS 테마는 style.css 의 `tr[data-special-game="<marker>"]` 블록에서 정의)
 *
 * ── 새 특별게임 추가 방법 (3스텝) ────────────────────────────────
 *   1) 옮길에셋/ 에 이미지 넣고  python sync_to_github.py  실행(에셋 업로드)
 *   2) 아래 SPECIAL_GAMES 배열에 config 객체 1개 추가
 *   3) style.css 에  tr[data-special-game="<marker>"]  테마 블록 1개 추가
 *
 * ── config 필드 ──────────────────────────────────────────────
 *   marker : string  — data-special-game 값 (CSS 셀렉터 키). 고유해야 함.
 *   match  : 매칭 규칙
 *            { type:'slot', slot:N }  — 기본 탭 top-N 슬롯이면서 그 슬롯의
 *                                       special_games 게임명과 일치할 때 (기존 방식)
 *            { type:'name', name:'게임명' } — 순위 무관, 이름이 정확히 일치할 때
 *   file   : string  — 단일 이미지 파일명 (stack 이 없을 때 사용)
 *   cls    : string  — 이미지에 붙일 클래스 (단일/스택 공통 접두)
 *   stack  : (선택) 여러 이미지를 겹칠 때
 *            { wrapCls:string, layers:[{file,cls}, ...] }
 *            각 레이어 img 클래스 = `${cls} ${layer.cls}` (기존 Fallout 동작 보존)
 */
(function (root) {
    const SPECIAL_GAMES = [
        {
            marker: 'dangan',
            match: { type: 'slot', slot: 1 },
            file: 'dangan.png',
            cls: 'top-rank-img',
        },
        {
            marker: 'mycar',
            match: { type: 'slot', slot: 2 },
            file: 'mycar.png',
            cls: 'top-rank-img-2',
        },
        {
            marker: 'fallout',
            match: { type: 'slot', slot: 3 },
            cls: 'top-rank-img-3',
            stack: {
                wrapCls: 'fallout-stack',
                layers: [
                    { file: 'Fallout.svg', cls: 'fallout-img-metal' },
                    { file: 'Fallout_pipboy.svg', cls: 'fallout-img-pipboy' },
                ],
            },
        },
    ];

    root.SPECIAL_GAMES = SPECIAL_GAMES;
})(typeof window !== 'undefined' ? window : globalThis);
