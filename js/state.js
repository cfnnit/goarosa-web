function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function rowId(name) {
    return "row-" + name.replace(/[^a-zA-Z0-9가-힣]/g, "_");
}

function splitTextForImpact(text) {
    if (!text) return document.createDocumentFragment();
    const fragment = document.createDocumentFragment();
    text.toString().split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.style.animationDelay = `${index * 0.15}s`;
        if (char === ' ') {
            span.innerHTML = '&nbsp;';
        } else {
            span.textContent = char;
        }
        fragment.appendChild(span);
    });
    return fragment;
}

const AppState = {
    data: [],
    logs: [],
    tabs: [],
    activeTab: localStorage.getItem('lastActiveTab') || '기본 탭',
    focusTarget: null,

    hoverProgress: 0,
    hoverInterval: null,
    currentChart: null,
    isHovering: false,
    isSystemAnimating: false,

    availableBanners: [],
    downloadedAssets: {},

    logOffset: 50,
    isFetchingLogs: false,
    hasMoreLogs: true,

    graphDataLoading: false,

    hasSeenJumpscare: false,
};

const STATE_ALIASES = {
    currentData: 'data',
    currentLogs: 'logs',
    currentTabs: 'tabs',
    activeTab: 'activeTab',
    focusTarget: 'focusTarget',
    hoverProgress: 'hoverProgress',
    hoverInterval: 'hoverInterval',
    currentChart: 'currentChart',
    availableBanners: 'availableBanners',
    downloadedAssets: 'downloadedAssets',
    hasSeenJumpscare: 'hasSeenJumpscare',
    logOffset: 'logOffset',
    isFetchingLogs: 'isFetchingLogs',
    graphDataLoading: 'graphDataLoading',
    isHovering: 'isHovering',
    hasMoreLogs: 'hasMoreLogs',
    isSystemAnimating: 'isSystemAnimating',
};

for (const [alias, key] of Object.entries(STATE_ALIASES)) {
    Object.defineProperty(window, alias, {
        configurable: true,
        get() { return AppState[key]; },
        set(v) { AppState[key] = v; },
    });
}

window.GLOBAL_ATTACK_TYPES = ['DASH', 'WARP', 'PIERCE', 'RAILGUN', 'THROW', 'UPPERCUT', 'SMASH', 'MAGIC', 'BEAM_ATTACK', 'SLASH_ATTACK', 'COMIC_DROP', 'PHANTOM_STRIKE', 'STUN_GRENADE', 'VORTEX_PULL', 'GLITCH_STEP'];
window.GLOBAL_FINISHERS = ['BASH', 'HOMERUN', 'METEOR_SLAM', 'BURN', 'SLASH', 'SQUASH', 'MAGO', 'ORBITAL_STRIKE', 'EXPLODE', 'BLACK_HOLE', 'JUDGMENT_SPEAR', 'THUNDER_EXECUTION', 'DIMENSION_SHATTER', 'VOID_REAP', 'SUPERNOVA', 'THE_WORLD', 'MSC_KILL', 'GATE_OF_BABYLON', 'STANDING_REAL', 'STORM_APPROACHING'];
