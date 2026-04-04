// ==UserScript==
// @name         Better Faction Chat – Torn.com
// @namespace    https://torn.com/
// @version      1.4.7
// @description  Activity status, rank icons, travel icons, @mention autocomplete, fixed search, real timestamps – by sercann
// @author       sercann
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/572030/Better%20Faction%20Chat%20%E2%80%93%20Torncom.user.js
// @updateURL https://update.greasyfork.org/scripts/572030/Better%20Faction%20Chat%20%E2%80%93%20Torncom.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const BFC_VERSION = '1.4.7';
    const STORE_KEY   = 'bfc_settings_v2';
    const API_BASE    = 'https://api.torn.com';

    const DEFAULTS = {
        apiKey:           '',
        username:         '',
        refreshInterval:  60,
        showTimestamps:   true,
        showTravelIcons:  true,
        showRankIcons:    true,
        autoScroll:       true,
        mentionEnabled:   true,
        hideGearBtn:      false,
        statusColors: { online: '#00e676', idle: '#ffab40', offline: '#546e7a' },
        mentionColor:     '#ff5252',
        accentColor:      '#29b6f6',
    };

    function loadCfg() {
        let raw = null;
        
        try { if (typeof GM_getValue !== 'undefined') raw = GM_getValue(STORE_KEY, null); } catch(e) {}
        try { if (!raw && typeof window.localStorage !== 'undefined') raw = window.localStorage.getItem(STORE_KEY); } catch(e) {}
        try {
            if (!raw) {
                const match = document.cookie.match(new RegExp('(^| )' + STORE_KEY + '=([^;]+)'));
                if (match) raw = decodeURIComponent(match[2]);
            }
        } catch(e) {}

        if (!raw) return Object.assign({}, DEFAULTS);
        
        try {
            const saved = JSON.parse(raw);
            return Object.assign({}, DEFAULTS, saved, {
                statusColors: Object.assign({}, DEFAULTS.statusColors, saved.statusColors || {})
            });
        } catch(e) { 
            return Object.assign({}, DEFAULTS); 
        }
    }

    function saveCfg(c) {
        const raw = JSON.stringify(c);
        try { if (typeof GM_setValue !== 'undefined') GM_setValue(STORE_KEY, raw); } catch(e) {}
        try { if (typeof window.localStorage !== 'undefined') window.localStorage.setItem(STORE_KEY, raw); } catch(e) {}
        try { document.cookie = STORE_KEY + "=" + encodeURIComponent(raw) + "; max-age=31536000; path=/;"; } catch(e) {}
    }

    let CFG = loadCfg();

    const STATE_ICONS = {
        traveling: '✈️', abroad: '🌍', hospital: '🏥',
        jail: '⛓️', federal: '🔒', fallen: '💀',
    };

    const RANK_ICONS = {
        leader:       '👑',
        'co-leader':  '⭐',
        'coleader':   '⭐',
        'co leader':  '⭐',
    };
    const RANK_ICON_DEFAULT = '⚔️';

    function getRankIcon(position, name) {
        if (name && name.toLowerCase() === 'sercann') return '⚙️';
        if (!position) return RANK_ICON_DEFAULT;
        return RANK_ICONS[position.toLowerCase()] || RANK_ICON_DEFAULT;
    }

    function getRankTitle(position, name) {
        if (name && name.toLowerCase() === 'sercann') return 'BFC Developer';
        return position || 'Member';
    }

    GM_addStyle(`
        .bfc-dot { display:inline-block; width:7px; height:7px; border-radius:50%; margin:0 5px 0 2px; vertical-align:middle; flex-shrink:0; transition:background .35s,box-shadow .35s; cursor:pointer; }
        .bfc-state-icon { font-size:12px; margin:0 4px; vertical-align:middle; cursor:pointer; line-height:1; }
        .bfc-state-icon:empty { display:none; }
        .bfc-rank-icon { font-size:11px; margin:0 4px 0 2px; vertical-align:middle; cursor:pointer; line-height:1; opacity:.85; }
        .bfc-rank-icon:empty { display:none; }

        .bfc-tip { position: relative; }
        .bfc-tip::after { content: attr(data-bfc-title); position: absolute; bottom: 100%; left: 0; background: #161b22; color: #cdd9e5; padding: 4px 8px; border-radius: 4px; font-size: 11px; white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none; z-index: 99999; border: 1px solid #30363d; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: 'Segoe UI', sans-serif; font-weight: 600; margin-bottom: 6px; transition: opacity 0.15s ease; }
        .bfc-tip:hover::after, .bfc-tip:active::after { opacity: 1; visibility: visible; }

        .bfc-mentioned { border-left:3px solid ${CFG.mentionColor}!important; background:rgba(255,82,82,.09)!important; padding-left:6px!important; border-radius:0 4px 4px 0; animation:bfc-pulse 1.4s ease-in-out 4; }
        @keyframes bfc-pulse { 0%,100%{background:rgba(255,82,82,.09)} 50%{background:rgba(255,82,82,.28)} }
        .bfc-jump-outline { outline:2px solid ${CFG.mentionColor}; outline-offset:2px; border-radius:3px; }

        #bfc-mention-popup { position:absolute; bottom:100%; left:0; width:100%; background:#0d1117; border:1px solid #21262d; border-radius:8px 8px 0 0; max-height:160px; overflow-y:auto; display:none; z-index:99999; box-shadow:0 -8px 24px rgba(0,0,0,.6); font-family:'Segoe UI',sans-serif; margin-bottom:4px; }
        #bfc-mention-popup.bfc-open { display:block; animation:bfc-fadein .15s ease; }
        .bfc-ms-item { padding:8px 12px; cursor:pointer; color:#cdd9e5; display:flex; align-items:center; gap:8px; border-bottom:1px solid #161b22; font-size:12px; }
        .bfc-ms-item:last-child { border-bottom:none; }
        .bfc-ms-item.bfc-active, .bfc-ms-item:hover { background:rgba(41,182,246,.15); }

        #bfc-notify-bar { display:none; align-items:center; gap:8px; padding:6px 12px; background:linear-gradient(135deg,#b71c1c,${CFG.mentionColor}); color:#fff; font-size:12px; font-weight:600; cursor:pointer; user-select:none; animation:bfc-glow 2s ease-in-out infinite alternate; box-sizing:border-box; width:100%; }
        #bfc-notify-bar.bfc-active { display:flex; }
        @keyframes bfc-glow { from{box-shadow:0 0 6px rgba(255,82,82,.5)} to{box-shadow:0 0 18px rgba(255,82,82,.9)} }
        #bfc-nb-badge { background:#fff; color:${CFG.mentionColor}; border-radius:10px; min-width:20px; height:18px; font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; padding:0 5px; }
        #bfc-notify-nav { margin-left:auto; display:flex; gap:4px; align-items:center; }
        .bfc-nav-btn { background:rgba(255,255,255,.2); border:none; color:#fff; border-radius:3px; cursor:pointer; font-size:12px; padding:1px 7px; transition:background .15s; }
        .bfc-nav-btn:hover { background:rgba(255,255,255,.35); }

        #bfc-toolbar { display:flex; align-items:center; justify-content:space-between; gap:5px; padding:6px 8px; background:#1e1e1e; border-top:1px solid #333; box-sizing:border-box; width:100%; }
        .bfc-tb-group { display:flex; gap:4px; align-items:center; }
        .bfc-tb-btn { background:#2d2d2d; border:1px solid #444; color:#ccc; border-radius:4px; font-size:11px; padding:3px 6px; cursor:pointer; transition:all .15s; white-space:nowrap; }
        .bfc-tb-btn:hover { background:#3d3d3d; color:#fff; border-color:#555; }
        .bfc-tb-on { color:${CFG.statusColors.online}!important; border-color:${CFG.statusColors.online}40!important; background:rgba(0,230,118,.1)!important; }
        #bfc-status-pill { font-size:11px; color:#888; white-space:nowrap; padding:2px 6px; background:#111; border-radius:4px; border:1px solid #2a2a2a; }

        #bfc-search-bar { display:none; align-items:center; gap:5px; padding:6px 8px; background:#181818; border-top:1px solid #2e2e2e; box-sizing:border-box; width:100%; }
        #bfc-search-bar.bfc-active { display:flex; }
        #bfc-search-input { flex:1; background:#111; border:1px solid #444; border-radius:4px; color:#e0e0e0; padding:4px 8px; font-size:12px; outline:none; min-width:0; transition:border-color .2s; }
        #bfc-search-input:focus { border-color:${CFG.accentColor}; }
        #bfc-search-input::placeholder { color:#555; }
        .bfc-s-match  { background:rgba(41,182,246,.13)!important; }
        .bfc-s-active { background:rgba(41,182,246,.3)!important; outline:1px solid ${CFG.accentColor}; }
        #bfc-search-count { font-size:11px; color:#777; min-width:44px; text-align:center; white-space:nowrap; }
        .bfc-sarrow { background:#2d2d2d; border:1px solid #444; color:#ccc; border-radius:3px; cursor:pointer; padding:2px 7px; font-size:13px; transition:all .15s; }
        .bfc-sarrow:hover { background:#3d3d3d; color:#fff; }

        .bfc-ts { font-size:10px; color:#666; margin:0 8px 0 4px; font-variant-numeric:tabular-nums; display:inline-block; vertical-align:middle; pointer-events:none; font-family:monospace; }

        .bfc-msg-container { position:relative!important; padding-right:26px!important; }
        .bfc-cp-btn { position:absolute; right:2px; top:50%; transform:translateY(-50%); background:#2d2d2d; border:1px solid #444; border-radius:4px; color:#888; width:22px; height:22px; cursor:pointer; display:none; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; z-index:10; }
        .bfc-cp-btn:hover { background:#444; color:#fff; border-color:#666; }
        .bfc-msg-container:hover .bfc-cp-btn { display:inline-flex; }

        #bfc-member-popup { position:fixed; z-index:9999999; background:#0d1117; border:1px solid #21262d; border-radius:10px; box-shadow:0 8px 28px rgba(0,0,0,.7); padding:8px 0; width:270px; max-height:340px; overflow-y:auto; display:none; font-family:'Segoe UI',sans-serif; font-size:12px; }
        #bfc-member-popup.bfc-open { display:block; animation:bfc-fadein .15s ease; }
        @keyframes bfc-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .bfc-mp-hdr { padding:6px 12px 9px; color:#8b949e; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; border-bottom:1px solid #21262d; margin-bottom:4px; display:flex; gap:10px; }
        .bfc-mp-item { display:flex; align-items:center; padding:5px 12px; gap:5px; transition:background .1s; }
        .bfc-mp-item:hover { background:rgba(255,255,255,.04); }
        .bfc-mp-name { flex:1; color:#cdd9e5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .bfc-mp-time { font-size:10px; color:#484f58; white-space:nowrap; }
        .bfc-mp-state { font-size:11px; flex-shrink:0; }
        .bfc-mp-rank { font-size:11px; flex-shrink:0; opacity:.8; }
        .bfc-col-on { color:${CFG.statusColors.online}; } .bfc-col-idle { color:${CFG.statusColors.idle}; } .bfc-col-off { color:#484f58; }

        #bfc-gear-btn { position:fixed; bottom:14px; left:14px; z-index:9999999; width:38px; height:38px; border-radius:50%; background:#1a1a2e; color:#90caf9; border:1.5px solid #2a4070; font-size:17px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 14px rgba(0,0,0,.55); transition:all .22s cubic-bezier(.4,0,.2,1); line-height:1; }
        #bfc-gear-btn:hover { background:${CFG.accentColor}; border-color:${CFG.accentColor}; color:#fff; transform:rotate(60deg) scale(1.08); box-shadow:0 4px 18px rgba(41,182,246,.4); }

        #bfc-panel { position:fixed; bottom:60px; left:14px; z-index:9999999; width:320px; background:#0d1117; border:1px solid #21262d; border-radius:12px; color:#cdd9e5; font-size:12.5px; font-family:'Segoe UI',sans-serif; box-shadow:0 10px 36px rgba(0,0,0,.75); display:none; overflow:hidden; }
        #bfc-panel.bfc-open { display:flex; flex-direction:column; animation:bfc-fadein .18s ease; }
        #bfc-ph { display:flex; align-items:center; gap:8px; padding:14px 16px 12px; background:linear-gradient(135deg,#161b22,#1c2333); border-bottom:1px solid #21262d; flex-shrink:0; }
        #bfc-ph h3 { margin:0; font-size:14px; font-weight:700; color:${CFG.accentColor}; flex:1; }
        #bfc-pver { font-size:10px; color:#484f58; background:#161b22; border:1px solid #30363d; border-radius:20px; padding:1px 7px; }
        #bfc-pb { padding:14px 16px; max-height:70vh; overflow-y:auto; flex:1; }
        #bfc-pb::-webkit-scrollbar { width:4px; }
        #bfc-pb::-webkit-scrollbar-thumb { background:#30363d; border-radius:4px; }
        .bfc-lbl { display:block; color:#8b949e; font-size:11px; font-weight:600; margin-bottom:5px; text-transform:uppercase; letter-spacing:.5px; }
        .bfc-inp { width:100%; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; padding:7px 10px; font-size:12px; box-sizing:border-box; outline:none; transition:border-color .2s; }
        .bfc-inp:focus { border-color:${CFG.accentColor}; }
        .bfc-inp::placeholder { color:#484f58; }
        .bfc-inp-num { width:72px; background:#161b22; border:1px solid #30363d; border-radius:6px; color:#e6edf3; padding:5px 8px; font-size:12px; outline:none; text-align:center; }
        .bfc-inp-num:focus { border-color:${CFG.accentColor}; }
        .bfc-fld { margin-bottom:12px; }
        .bfc-div { border:none; border-top:1px solid #21262d; margin:14px 0 12px; }
        .bfc-slbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.1px; color:#484f58; margin-bottom:10px; display:block; }
        .bfc-row { display:flex; align-items:center; margin-bottom:10px; gap:8px; }
        .bfc-row span { flex:1; color:#8b949e; font-size:12px; }
        .bfc-sw { position:relative; width:36px; height:20px; flex-shrink:0; }
        .bfc-sw input { opacity:0; width:0; height:0; }
        .bfc-swt { position:absolute; inset:0; background:#30363d; border-radius:20px; cursor:pointer; transition:background .25s; }
        .bfc-swt::before { content:''; position:absolute; width:14px; height:14px; left:3px; top:3px; background:#8b949e; border-radius:50%; transition:transform .25s,background .25s; }
        .bfc-sw input:checked+.bfc-swt { background:${CFG.accentColor}44; }
        .bfc-sw input:checked+.bfc-swt::before { transform:translateX(16px); background:${CFG.accentColor}; }
        .bfc-color-row { display:flex; align-items:center; margin-bottom:9px; gap:8px; }
        .bfc-color-row span { flex:1; color:#8b949e; font-size:12px; }
        .bfc-color-row input[type=color] { width:32px; height:26px; border:1px solid #30363d; border-radius:5px; background:#161b22; cursor:pointer; padding:1px 2px; }
        #bfc-save-btn { width:100%; padding:9px; background:${CFG.accentColor}; color:#fff; border:none; border-radius:7px; font-size:13px; font-weight:700; cursor:pointer; margin-top:6px; transition:background .2s,transform .1s; }
        #bfc-save-btn:hover { background:#039be5; }
        #bfc-save-btn:active { transform:scale(.98); }
        #bfc-test-btn { width:100%; padding:7px; background:transparent; border:1px solid #30363d; border-radius:7px; color:#8b949e; font-size:12px; cursor:pointer; transition:all .2s; margin-bottom:8px; }
        #bfc-test-btn:hover { border-color:${CFG.accentColor}; color:${CFG.accentColor}; }
        #bfc-status-msg { text-align:center; font-size:11px; min-height:16px; margin-top:8px; }
        .bfc-mention-note { font-size:10px; color:#484f58; margin-top:-6px; margin-bottom:10px; line-height:1.5; padding:5px 8px; background:#0d1117; border:1px solid #21262d; border-radius:5px; }
        #bfc-credit { flex-shrink:0; text-align:center; padding:9px 16px 11px; border-top:1px solid #21262d; font-size:11px; color:#484f58; background:#0a0e14; }
        #bfc-credit a { color:${CFG.accentColor}; text-decoration:none; font-weight:600; }
        #bfc-credit a:hover { text-decoration:underline; color:#63cfff; }
        .bfc-user-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; padding:6px 10px; background:#161b22; border:1px solid #21262d; border-radius:7px; }
        .bfc-user-row .label { font-size:11px; color:#484f58; }
        .bfc-user-row .val { font-size:12px; font-weight:700; color:${CFG.accentColor}; flex:1; }

        #bfc-torn-restore-btn { display:block; width:100%; margin-top:10px; padding:7px 10px; background:#1a2535; border:1px solid ${CFG.accentColor}66; border-radius:4px; color:${CFG.accentColor}; font-size:12px; font-weight:600; cursor:pointer; text-align:center; box-sizing:border-box; transition:background .15s,border-color .15s; }
        #bfc-torn-restore-btn:hover { background:#1e3050; border-color:${CFG.accentColor}; }
    `);

    function findMsgList(root) {
        return root.querySelector('[class*="scrollWrapper__"]') || root;
    }
    function findMsgItems(root) {
        const boxes = root.querySelectorAll('[class*="box__"]');
        if (boxes.length > 0) return Array.from(boxes);
        const vItems = root.querySelectorAll('[class*="virtualItem__"]');
        if (vItems.length > 0) return Array.from(vItems);
        return [];
    }
    function findNameEl(msgEl) {
        return msgEl.querySelector('[class*="senderContainer__"]')
            || msgEl.querySelector('a[href*="profiles.php"]');
    }
    function findBodyEl(msgEl) {
        return msgEl.querySelector('[class*="body__"]')
            || msgEl.querySelector('[class*="message__"]')
            || msgEl.querySelector('[class*="content__"]');
    }

    let memberCache = {}, nameIndex = {}, pollTimer = null;
    const processedMsgs = [];

    async function apiFetch(path) {
        if (!CFG.apiKey) return null;
        try {
            const r = await fetch(`${API_BASE}${path}&key=${CFG.apiKey}`);
            const d = await r.json();
            if (d.error) throw new Error(d.error.error);
            return d;
        } catch { return null; }
    }

    async function fetchMyUsername() {
        if (!CFG.apiKey || CFG.username) return;
        const d = await apiFetch('/user/?selections=basic');
        if (d && d.name) {
            CFG.username = d.name;
            saveCfg(CFG);
            const el = document.getElementById('bfc-disp-user');
            if (el) el.textContent = d.name;
        }
    }

    async function pollStatuses() {
        const d = await apiFetch('/faction/?selections=basic');
        if (!d || !d.members) { updatePill('API Error', true); return; }
        memberCache = {}; nameIndex = {};
        let counts = { online: 0, idle: 0, offline: 0 };
        Object.entries(d.members).forEach(([id, m]) => {
            const rawStatus = (m.last_action && m.last_action.status ? m.last_action.status : 'Offline').toLowerCase();
            const status = rawStatus === 'online' ? 'online' : rawStatus === 'idle' ? 'idle' : 'offline';
            const rawState  = (m.status && m.status.state ? m.status.state : 'Okay').toLowerCase();
            const stateDesc = (m.status && m.status.description ? m.status.description : '');
            const position  = m.position || '';
            memberCache[id] = { name: m.name, status, lastSeen: m.last_action ? m.last_action.timestamp : 0, state: rawState, stateDesc, position };
            nameIndex[m.name.toLowerCase()] = id;
            counts[status]++;
        });
        updateAllDots();
        updateMemberPopup();
        updatePill(`${counts.online} On · ${counts.idle} Idl`);
    }

    function startPoll() {
        clearInterval(pollTimer);
        if (!CFG.apiKey) { updatePill('No API Key', true); return; }
        pollStatuses();
        pollTimer = setInterval(pollStatuses, CFG.refreshInterval * 1000);
    }

    function dotColor(status) {
        return status === 'online' ? CFG.statusColors.online
             : status === 'idle'   ? CFG.statusColors.idle
             :                       CFG.statusColors.offline;
    }
    function refreshDot(dot, info) {
        if (!info) { dot.style.background = CFG.statusColors.offline; dot.style.boxShadow = 'none'; dot.setAttribute('data-bfc-title', 'Unknown'); return; }
        const color = dotColor(info.status);
        dot.style.background = color;
        dot.style.boxShadow  = info.status !== 'offline' ? `0 0 5px ${color}` : 'none';
        dot.setAttribute('data-bfc-title', capitalize(info.status) + (info.lastSeen ? ' · ' + timeAgo(info.lastSeen) : ''));
    }
    function refreshStateIcon(el, info) {
        if (!info || !CFG.showTravelIcons) { el.textContent = ''; return; }
        const icon = STATE_ICONS[info.state] || '';
        el.textContent = icon;
        if (icon) el.setAttribute('data-bfc-title', info.stateDesc || capitalize(info.state));
    }
    function refreshRankIcon(el, info) {
        if (!info || !CFG.showRankIcons) { el.textContent = ''; return; }
        el.textContent = getRankIcon(info.position, info.name);
        el.setAttribute('data-bfc-title', getRankTitle(info.position, info.name));
    }
    function injectIndicators(nameEl, lcName) {
        if (nameEl.querySelector('.bfc-dot')) return;
        const id = nameIndex[lcName], info = id ? memberCache[id] : null;

        const dot = document.createElement('span');
        dot.className = 'bfc-dot bfc-tip'; dot.dataset.bfcFor = lcName; refreshDot(dot, info);
        dot.addEventListener('click', e => e.stopPropagation());

        const stateIcon = document.createElement('span');
        stateIcon.className = 'bfc-state-icon bfc-tip'; stateIcon.dataset.bfcStateFor = lcName; refreshStateIcon(stateIcon, info);
        stateIcon.addEventListener('click', e => e.stopPropagation());

        const rankIcon = document.createElement('span');
        rankIcon.className = 'bfc-rank-icon bfc-tip'; rankIcon.dataset.bfcRankFor = lcName; refreshRankIcon(rankIcon, info);
        rankIcon.addEventListener('click', e => e.stopPropagation());

        nameEl.prepend(rankIcon);
        nameEl.prepend(stateIcon);
        nameEl.prepend(dot);
    }
    function updateAllDots() {
        document.querySelectorAll('.bfc-dot[data-bfc-for]').forEach(dot => {
            const id = nameIndex[dot.dataset.bfcFor]; refreshDot(dot, id ? memberCache[id] : null);
        });
        document.querySelectorAll('.bfc-state-icon[data-bfc-state-for]').forEach(el => {
            const id = nameIndex[el.dataset.bfcStateFor]; refreshStateIcon(el, id ? memberCache[id] : null);
        });
        document.querySelectorAll('.bfc-rank-icon[data-bfc-rank-for]').forEach(el => {
            const id = nameIndex[el.dataset.bfcRankFor]; refreshRankIcon(el, id ? memberCache[id] : null);
        });
    }

    let mentionSuggestPopup = null;
    let currentMentionState = null;
    let suggestMatches = [];
    let suggestIndex = 0;

    function setupMentionAutocomplete(chatBox) {
        const textarea = chatBox.querySelector('textarea');
        if (!textarea || textarea.dataset.bfcMentionBound) return;

        textarea.dataset.bfcMentionBound = "1";
        textarea.parentElement.style.position = 'relative';

        mentionSuggestPopup = document.createElement('div');
        mentionSuggestPopup.id = 'bfc-mention-popup';
        textarea.parentElement.appendChild(mentionSuggestPopup);

        textarea.addEventListener('input', handleMentionInput);
        textarea.addEventListener('keydown', handleMentionKeydown, true);
        textarea.addEventListener('blur', () => setTimeout(closeMentionSuggest, 150));
        textarea.addEventListener('click', handleMentionInput);
    }

    function handleMentionInput(e) {
        const input = e.target;
        const val = input.value;
        const cursor = input.selectionStart;
        const textBefore = val.slice(0, cursor);

        const match = textBefore.match(/(?:^|\s)@([^\s]*)$/);

        if (match) {
            currentMentionState = { input, query: match[1].toLowerCase(), start: match.index + (match[0].startsWith(' ') ? 1 : 0), end: cursor };
            updateSuggestions();
        } else {
            closeMentionSuggest();
        }
    }

    function updateSuggestions() {
        if (!currentMentionState) return;
        const query = currentMentionState.query;

        suggestMatches = Object.values(memberCache)
            .map(m => m.name)
            .filter(name => name.toLowerCase().includes(query))
            .sort((a, b) => {
                const aStarts = a.toLowerCase().startsWith(query);
                const bStarts = b.toLowerCase().startsWith(query);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            })
            .slice(0, 6);

        if (suggestMatches.length === 0) {
            closeMentionSuggest();
            return;
        }

        suggestIndex = 0;
        renderSuggestions();
    }

    function renderSuggestions() {
        if (!mentionSuggestPopup) return;

        mentionSuggestPopup.innerHTML = suggestMatches.map((name, i) => {
            const id = nameIndex[name.toLowerCase()];
            const info = id ? memberCache[id] : null;
            const status = info ? info.status : 'offline';
            const color = dotColor(status);
            const shadow = status !== 'offline' ? `0 0 5px ${color}` : 'none';

            return `
                <div class="bfc-ms-item ${i === suggestIndex ? 'bfc-active' : ''}" data-name="${name}">
                    <span class="bfc-dot" style="background:${color};box-shadow:${shadow};"></span>
                    ${name}
                </div>
            `;
        }).join('');

        mentionSuggestPopup.classList.add('bfc-open');

        mentionSuggestPopup.querySelectorAll('.bfc-ms-item').forEach(el => {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                applyMention(this.dataset.name);
            });
        });
    }

    function handleMentionKeydown(e) {
        if (!mentionSuggestPopup || !mentionSuggestPopup.classList.contains('bfc-open')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopImmediatePropagation();
            suggestIndex = (suggestIndex + 1) % suggestMatches.length;
            renderSuggestions();
            scrollSuggestIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopImmediatePropagation();
            suggestIndex = (suggestIndex - 1 + suggestMatches.length) % suggestMatches.length;
            renderSuggestions();
            scrollSuggestIntoView();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            e.stopImmediatePropagation();
            applyMention(suggestMatches[suggestIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopImmediatePropagation();
            closeMentionSuggest();
        }
    }

    function scrollSuggestIntoView() {
        if (!mentionSuggestPopup) return;
        const active = mentionSuggestPopup.querySelector('.bfc-active');
        if (active) active.scrollIntoView({ block: 'nearest' });
    }

    function applyMention(name) {
        if (!currentMentionState) return;
        const input = currentMentionState.input;
        const val = input.value;
        const state = currentMentionState;

        const newVal = val.slice(0, state.start) + '@' + name + ' ' + val.slice(state.end);

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(input, newVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));

        input.focus();
        const newCursor = state.start + name.length + 2;
        input.setSelectionRange(newCursor, newCursor);

        closeMentionSuggest();
    }

    function closeMentionSuggest() {
        if (mentionSuggestPopup) mentionSuggestPopup.classList.remove('bfc-open');
        currentMentionState = null;
    }

    const processedMsgFps = new Set();

    function getMsgFingerprint(msgEl) {
        const sender = (findNameEl(msgEl)?.textContent || '').trim().replace(/[:\s]+$/, '').slice(0, 30);
        const body   = (findBodyEl(msgEl) || msgEl).textContent.trim().slice(0, 80);
        const ts     = getMsgTimestamp(msgEl);
        return sender + '|' + ts + '|' + body;
    }

    let mentionStack = [], mentionIdx = 0, notifyBar = null;

    function buildNotifyBar(container) {
        if (container.querySelector('#bfc-notify-bar')) { notifyBar = container.querySelector('#bfc-notify-bar'); return; }
        notifyBar = document.createElement('div');
        notifyBar.id = 'bfc-notify-bar';
        notifyBar.innerHTML =
            '<span>🔔</span><span id="bfc-nb-badge">0</span><span id="bfc-nb-label">You were mentioned</span>' +
            '<span id="bfc-notify-nav"><button class="bfc-nav-btn" id="bfc-prev-m">‹</button><button class="bfc-nav-btn" id="bfc-next-m">›</button></span>' +
            '<span id="bfc-nb-dismiss" style="cursor:pointer;margin-left:4px;opacity:.8" title="Dismiss">✕</span>';
        notifyBar.addEventListener('click', e => {
            if (e.target.id === 'bfc-nb-dismiss') { clearMentions(); return; }
            if (e.target.id === 'bfc-prev-m') { jumpMention(-1); return; }
            if (e.target.id === 'bfc-next-m') { jumpMention(1);  return; }
            jumpMention(1);
        });
        container.insertBefore(notifyBar, container.firstChild);
    }

    function refreshBar() {
        if (!notifyBar) return;
        const n = mentionStack.length;
        notifyBar.classList.toggle('bfc-active', n > 0);
        const badge = document.getElementById('bfc-nb-badge');
        const label = document.getElementById('bfc-nb-label');
        if (badge) badge.textContent = n > 99 ? '99+' : n;
        if (label) label.textContent = n === 1 ? 'You were mentioned — click to jump' : `Mentioned ${n}× · ${mentionIdx + 1}/${n}`;
    }

    function checkMention(msgEl) {
        if (!CFG.mentionEnabled || !CFG.username) return;
        if (new RegExp('@' + escRx(CFG.username) + '\\b', 'i').test(msgEl.textContent)) {
            msgEl.classList.add('bfc-mentioned');
            mentionStack.push(msgEl);
            refreshBar();
        }
    }

    function jumpMention(dir) {
        if (!mentionStack.length) return;
        mentionIdx = (mentionIdx + dir + mentionStack.length) % mentionStack.length;
        const el = mentionStack[mentionIdx];
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bfc-jump-outline');
        setTimeout(() => el.classList.remove('bfc-jump-outline'), 1800);
        refreshBar();
    }
    function clearMentions() { mentionStack = []; mentionIdx = 0; refreshBar(); }

    let toolbar = null, statusPill = null, autoScrollOn = CFG.autoScroll;

    function buildToolbar(container) {
        if (container.querySelector('#bfc-toolbar')) { toolbar = container.querySelector('#bfc-toolbar'); return; }
        toolbar = document.createElement('div');
        toolbar.id = 'bfc-toolbar';
        const left  = document.createElement('div'); left.className  = 'bfc-tb-group';
        const right = document.createElement('div'); right.className = 'bfc-tb-group';

        const scrollBtn = mkBtn('⏬ Scroll', autoScrollOn ? 'bfc-tb-on' : '');
        scrollBtn.title = 'Toggle auto-scroll to new messages';
        scrollBtn.addEventListener('click', () => {
            autoScrollOn = !autoScrollOn;
            scrollBtn.classList.toggle('bfc-tb-on', autoScrollOn);
            CFG.autoScroll = autoScrollOn; saveCfg(CFG);
        });

        const searchBtn = mkBtn('🔍 Search');
        searchBtn.title = 'Search chat messages (Ctrl+F)';
        searchBtn.addEventListener('click', () => toggleSearch());

        const memberBtn = mkBtn('👥 Members');
        memberBtn.title = 'Show faction member statuses';
        memberBtn.addEventListener('click', e => toggleMemberPopup(e.currentTarget));

        statusPill = document.createElement('span');
        statusPill.id = 'bfc-status-pill';
        statusPill.textContent = CFG.apiKey ? 'Loading…' : 'No API Key';

        left.append(scrollBtn, searchBtn, memberBtn);
        right.append(statusPill);
        toolbar.append(left, right);
        container.appendChild(toolbar);
    }

    function mkBtn(text, cls) {
        const b = document.createElement('button');
        b.className = 'bfc-tb-btn' + (cls ? ' ' + cls : '');
        b.textContent = text;
        return b;
    }
    function updatePill(text, err) {
        if (!statusPill) statusPill = document.getElementById('bfc-status-pill');
        if (!statusPill) return;
        statusPill.textContent = text;
        statusPill.style.color = err ? CFG.mentionColor : '#aaa';
    }

    let searchBar = null, searchInput = null, searchHits = [], searchCursor = 0;

    function buildSearchBar(container) {
        if (container.querySelector('#bfc-search-bar')) { searchBar = container.querySelector('#bfc-search-bar'); return; }
        searchBar = document.createElement('div');
        searchBar.id = 'bfc-search-bar';
        searchBar.innerHTML =
            '<input id="bfc-search-input" type="text" placeholder="Search messages…" autocomplete="off">' +
            '<button class="bfc-sarrow" id="bfc-sp" title="Previous (Shift+Enter)">↑</button>' +
            '<button class="bfc-sarrow" id="bfc-sn" title="Next (Enter)">↓</button>' +
            '<span id="bfc-search-count"></span>' +
            '<button class="bfc-sarrow" id="bfc-sx" title="Close">✕</button>';
        container.appendChild(searchBar);
        searchInput = searchBar.querySelector('#bfc-search-input');
        searchInput.addEventListener('input', execSearch);
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.shiftKey ? moveSearch(-1) : moveSearch(1); }
            if (e.key === 'Escape') toggleSearch(false);
        });
        searchBar.querySelector('#bfc-sp').addEventListener('click', () => moveSearch(-1));
        searchBar.querySelector('#bfc-sn').addEventListener('click', () => moveSearch(1));
        searchBar.querySelector('#bfc-sx').addEventListener('click', () => toggleSearch(false));
    }

    function toggleSearch(force) {
        if (!searchBar) return;
        const on = (force !== undefined) ? force : !searchBar.classList.contains('bfc-active');
        searchBar.classList.toggle('bfc-active', on);
        if (on) { searchInput && searchInput.focus(); execSearch(); }
        else clearSearch(true);
    }

    function execSearch() {
        clearSearch(false);
        const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (!term) { updateSCount(); return; }
        searchHits = [];
        processedMsgs.forEach(({ el, bodyText }) => {
            if (!el.isConnected) return;
            if (bodyText.includes(term) || el.textContent.toLowerCase().includes(term)) {
                el.classList.add('bfc-s-match'); searchHits.push(el);
            }
        });
        if (searchHits.length) { searchCursor = 0; activateHit(0); }
        updateSCount();
    }

    function moveSearch(d) {
        if (!searchHits.length) return;
        searchHits[searchCursor].classList.remove('bfc-s-active');
        searchCursor = (searchCursor + d + searchHits.length) % searchHits.length;
        activateHit(searchCursor); updateSCount();
    }

    function activateHit(i) {
        searchHits[i].classList.add('bfc-s-active');
        searchHits[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function clearSearch(inp) {
        document.querySelectorAll('.bfc-s-match,.bfc-s-active').forEach(el => el.classList.remove('bfc-s-match', 'bfc-s-active'));
        searchHits = []; searchCursor = 0;
        if (inp && searchInput) searchInput.value = '';
        updateSCount();
    }

    function updateSCount() {
        const el = document.getElementById('bfc-search-count');
        if (!el) return;
        el.textContent = searchHits.length ? `${searchCursor + 1}/${searchHits.length}` : (searchInput && searchInput.value ? '0' : '');
    }

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'f' && chatBoxEl) { e.preventDefault(); toggleSearch(); }
    });

    let memberPopup = null;

    function buildMemberPopup() {
        if (memberPopup) return;
        memberPopup = document.createElement('div');
        memberPopup.id = 'bfc-member-popup';
        document.body.appendChild(memberPopup);
        document.addEventListener('click', e => {
            if (memberPopup && !memberPopup.contains(e.target) && !e.target.closest('.bfc-tb-btn'))
                memberPopup.classList.remove('bfc-open');
        });
    }

    function toggleMemberPopup(anchor) {
        if (!memberPopup) buildMemberPopup();
        const open = !memberPopup.classList.contains('bfc-open');
        memberPopup.classList.toggle('bfc-open', open);
        if (open) {
            const r = anchor.getBoundingClientRect();
            memberPopup.style.left = Math.max(4, r.left) + 'px';
            memberPopup.style.top  = Math.max(4, r.top - 10) + 'px';
            updateMemberPopup();
            requestAnimationFrame(() => {
                const h = memberPopup.offsetHeight;
                memberPopup.style.top = Math.max(4, r.top - h - 6) + 'px';
            });
        }
    }

    function updateMemberPopup() {
        if (!memberPopup || !memberPopup.classList.contains('bfc-open')) return;
        const entries = Object.values(memberCache).sort((a, b) => {
            const rank = { online: 0, idle: 1, offline: 2 };
            return (rank[a.status] - rank[b.status]) || a.name.localeCompare(b.name);
        });
        if (!entries.length) { memberPopup.innerHTML = '<div class="bfc-mp-hdr" style="border:none">No Data — Check API Key</div>'; return; }
        const on  = entries.filter(e => e.status === 'online').length;
        const idl = entries.filter(e => e.status === 'idle').length;
        const off = entries.filter(e => e.status === 'offline').length;
        memberPopup.innerHTML =
            `<div class="bfc-mp-hdr"><span class="bfc-col-on">● ${on} Online</span><span class="bfc-col-idle">● ${idl} Idle</span><span class="bfc-col-off">● ${off} Offline</span></div>` +
            entries.map(m => {
                const stateIcon = CFG.showTravelIcons ? (STATE_ICONS[m.state] || '') : '';
                const rankIcon  = CFG.showRankIcons   ? getRankIcon(m.position, m.name) : '';
                const stateTip  = stateIcon ? esc(m.stateDesc || capitalize(m.state)) : '';
                const rankTip   = getRankTitle(m.position, m.name);
                return `<div class="bfc-mp-item">
                    <span class="bfc-dot" style="background:${dotColor(m.status)};box-shadow:${m.status!=='offline'?`0 0 4px ${dotColor(m.status)}`:'none'}"></span>
                    ${rankIcon  ? `<span class="bfc-mp-rank" title="${esc(rankTip)}">${rankIcon}</span>` : ''}
                    ${stateIcon ? `<span class="bfc-mp-state" title="${stateTip}">${stateIcon}</span>` : ''}
                    <span class="bfc-mp-name" title="${esc(m.name)}">${esc(m.name)}</span>
                    <span class="bfc-mp-time">${m.lastSeen ? timeAgo(m.lastSeen) : ''}</span>
                </div>`;
            }).join('');
    }

    function getMsgTimestamp(msgEl) {
        let foundTs = null, strTime = null;
        try {
            const elements = [msgEl, ...msgEl.querySelectorAll('*')];
            for (let el of elements) {
                const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
                if (!fiberKey) continue;
                let node = el[fiberKey];
                for (let i = 0; i < 4; i++) {
                    if (!node) break;
                    const props = node.memoizedProps || node.pendingProps;
                    if (props) {
                        if (props.message && typeof props.message.time === 'number')      { foundTs = props.message.time; break; }
                        if (typeof props.time === 'number' && props.time > 1600000000)    { foundTs = props.time; break; }
                        if (props.message && typeof props.message.timestamp === 'number') { foundTs = props.message.timestamp; break; }
                        if (typeof props.timestamp === 'number' && props.timestamp > 1e9) { foundTs = props.timestamp; break; }
                        const tooltips = [props.title, props.tooltip, props.text, props.label];
                        for (let t of tooltips) {
                            if (typeof t === 'string' && t.includes(':')) {
                                const m = t.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
                                if (m) { strTime = pad2(m[1]) + ':' + pad2(m[2]); break; }
                            }
                        }
                    }
                    if (foundTs || strTime) break;
                    node = node.return;
                }
                if (foundTs || strTime) break;
            }
        } catch {}
        if (foundTs) {
            const d = new Date(foundTs < 1e12 ? foundTs * 1000 : foundTs);
            return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes());
        }
        if (strTime) return strTime;
        const timeSelectors = ['[class*="time__"]', '[class*="timestamp__"]', '[class*="timeAgo"]', 'time'];
        for (const sel of timeSelectors) {
            const el = msgEl.querySelector(sel);
            if (el) {
                const m = el.textContent.trim().match(/\b(\d{1,2}):(\d{2})\b/);
                if (m) return pad2(m[1]) + ':' + pad2(m[2]);
            }
        }
        return pad2(new Date().getUTCHours()) + ':' + pad2(new Date().getUTCMinutes());
    }

    function pad2(n) { return String(n).padStart(2, '0'); }

    let killerStyle = document.getElementById('bfc-tooltip-killer');
    if (!killerStyle) {
        killerStyle = document.createElement('style');
        killerStyle.id = 'bfc-tooltip-killer';
        document.head.appendChild(killerStyle);
    }

    function processMsg(msgEl) {
        if (msgEl.dataset.bfcDone) return;
        msgEl.dataset.bfcDone = '1';

        if (msgEl.parentElement && !msgEl.parentElement.classList.contains('bfc-msg-container')) {
            const container = document.createElement('div');
            container.className = 'bfc-msg-container';
            msgEl.parentNode.insertBefore(container, msgEl);
            container.appendChild(msgEl);
            injectCopy(container, msgEl);
        }

        const nameEl = findNameEl(msgEl);
        if (nameEl) {
            const rawName = nameEl.textContent.trim().replace(/[:\s]+$/, '');
            injectIndicators(nameEl, rawName.toLowerCase());
        }

        if (CFG.showTimestamps) injectTs(msgEl);

        const fp = getMsgFingerprint(msgEl);
        if (!processedMsgFps.has(fp)) {
            processedMsgFps.add(fp);
            checkMention(msgEl);
        }

        const bodyEl   = findBodyEl(msgEl);
        const bodyText = (bodyEl || msgEl).textContent.toLowerCase();
        processedMsgs.push({ el: msgEl, bodyText });

        const tooltipObserver = new MutationObserver((mutations) => {
            mutations.forEach(mut => {
                if (mut.attributeName === 'aria-describedby') {
                    const tId = msgEl.getAttribute('aria-describedby');
                    if (tId && !msgEl.dataset.ttHidden) {
                        msgEl.dataset.ttHidden = tId;
                        try {
                            killerStyle.sheet.insertRule(`[id="${tId}"] { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }`, killerStyle.sheet.cssRules.length);
                        } catch(e) {}
                    }
                }
            });
        });
        tooltipObserver.observe(msgEl, { attributes: true, attributeFilter: ['aria-describedby'] });

        if (autoScrollOn && msgListEl) {
            requestAnimationFrame(() => { msgListEl.scrollTop = msgListEl.scrollHeight; });
        }
    }

    function injectTs(msgEl) {
        if (msgEl.querySelector('.bfc-ts')) return;
        const label = getMsgTimestamp(msgEl);
        const ts = document.createElement('span');
        ts.className = 'bfc-ts'; ts.textContent = label; ts.title = 'TCT (UTC) time';
        const sender = msgEl.querySelector('[class*="senderContainer__"]');
        const body   = findBodyEl(msgEl);
        if (sender && body) msgEl.insertBefore(ts, body);
        else if (sender)    sender.insertAdjacentElement('afterend', ts);
        else                msgEl.appendChild(ts);
    }

    function injectCopy(container, msgEl) {
        if (container.querySelector('.bfc-cp-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'bfc-cp-btn'; btn.title = 'Copy message text';
        const IC = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        const IK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        btn.innerHTML = IC;
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const body = findBodyEl(msgEl);
            navigator.clipboard?.writeText((body || msgEl).textContent.trim()).catch(() => {});
            btn.innerHTML = IK;
            setTimeout(() => { btn.innerHTML = IC; }, 1400);
        });
        container.appendChild(btn);
    }

    let gearBtn = null;

    function applyGearVisibility() {
        if (!gearBtn) return;
        gearBtn.style.display = CFG.hideGearBtn ? 'none' : 'flex';
    }

    function findTornSettingsPanel() {
        const candidates = document.querySelectorAll('div');
        let bestMatch = null;
        for (const el of candidates) {
            if (!el.offsetParent) continue;
            const txt = el.textContent;

            if (txt.includes('Mark all as read') && txt.includes('General Settings')) {
                if (!bestMatch || bestMatch.contains(el)) {
                    bestMatch = el;
                }
            }
        }
        return bestMatch;
    }

    function tryInjectRestoreBtn() {
        if (!CFG.hideGearBtn) {
            const existing = document.getElementById('bfc-torn-restore-btn');
            if (existing) existing.remove();
            return;
        }
        const panel = findTornSettingsPanel();
        if (!panel) return;
        if (panel.querySelector('#bfc-torn-restore-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'bfc-torn-restore-btn';
        btn.textContent = '⚡ Open BFC Settings';
        btn.addEventListener('click', e => {
            e.stopPropagation();
            CFG.hideGearBtn = false;
            saveCfg(CFG);
            const hideChk = document.getElementById('s-hide');
            if (hideChk) hideChk.checked = false;
            applyGearVisibility();
            const bfcPanel = document.getElementById('bfc-panel');
            if (bfcPanel) bfcPanel.classList.add('bfc-open');
            btn.remove();
        });

        panel.prepend(btn);
    }

    let chatBoxEl = null, msgListEl = null, chatScanner = null;

    function runScanner() {
        if (chatScanner) clearInterval(chatScanner);
        chatScanner = setInterval(() => {
            tryInjectRestoreBtn();

            const box = document.querySelector('#chatRoot [id^="faction-"]');
            if (!box || box.style.display === 'none' || box.offsetParent === null) {
                chatBoxEl = null; msgListEl = null; return;
            }
            if (box !== chatBoxEl) {
                chatBoxEl = box;
                msgListEl = findMsgList(box);
                processedMsgs.length = 0;
                processedMsgFps.clear();
                buildMemberPopup();
                if (CFG.apiKey && !pollTimer) startPoll();
            }

            buildNotifyBar(chatBoxEl);
            buildToolbar(chatBoxEl);
            buildSearchBar(chatBoxEl);
            setupMentionAutocomplete(chatBoxEl);

            if (msgListEl) findMsgItems(msgListEl).forEach(processMsg);
        }, 800);
    }

    function buildSettingsPanel() {
        gearBtn = document.createElement('button');
        gearBtn.id = 'bfc-gear-btn';
        gearBtn.innerHTML = '⚙️';
        gearBtn.title = 'Better Faction Chat Settings';
        document.body.appendChild(gearBtn);

        const panel = document.createElement('div');
        panel.id = 'bfc-panel';
        panel.innerHTML = `
            <div id="bfc-ph">
                <h3>⚡ Better Faction Chat</h3>
                <span id="bfc-pver">v${BFC_VERSION}</span>
            </div>
            <div id="bfc-pb">
                <span class="bfc-slbl">API Connection</span>
                <div class="bfc-fld">
                    <label class="bfc-lbl">Torn API Key (Limited Access)</label>
                    <input class="bfc-inp" type="password" id="s-key" placeholder="Paste your API key here…" value="${esc(CFG.apiKey)}">
                </div>
                <div class="bfc-user-row">
                    <span class="label">Detected username:</span>
                    <span class="val" id="bfc-disp-user">${esc(CFG.username) || '—'}</span>
                </div>
                <button id="bfc-test-btn">🔑 Test Key &amp; Auto-detect Username</button>

                <hr class="bfc-div">
                <span class="bfc-slbl">Status Polling</span>
                <div class="bfc-row">
                    <span>Refresh interval (seconds, min 30)</span>
                    <input class="bfc-inp-num" type="number" id="s-ref" min="30" max="600" step="10" value="${CFG.refreshInterval}">
                </div>

                <hr class="bfc-div">
                <span class="bfc-slbl">@Mention System</span>
                <div class="bfc-row">
                    <span>🔔 Enable @mention detection</span>
                    <label class="bfc-sw"><input type="checkbox" id="s-men"${CFG.mentionEnabled?' checked':''}><span class="bfc-swt"></span></label>
                </div>
                <p class="bfc-mention-note">Only detects mentions while faction chat is open. Deduplication prevents re-triggers on scroll or chat reopen.</p>

                <hr class="bfc-div">
                <span class="bfc-slbl">Display</span>
                <div class="bfc-row">
                    <span>⏱ Show message timestamps (TCT)</span>
                    <label class="bfc-sw"><input type="checkbox" id="s-ts"${CFG.showTimestamps?' checked':''}><span class="bfc-swt"></span></label>
                </div>
                <div class="bfc-row">
                    <span>✈️ Show travel &amp; state icons</span>
                    <label class="bfc-sw"><input type="checkbox" id="s-travel"${CFG.showTravelIcons?' checked':''}><span class="bfc-swt"></span></label>
                </div>
                <div class="bfc-row">
                    <span>⚔️ Show faction rank icons</span>
                    <label class="bfc-sw"><input type="checkbox" id="s-rank"${CFG.showRankIcons?' checked':''}><span class="bfc-swt"></span></label>
                </div>
                <div class="bfc-row">
                    <span>⏬ Auto-scroll to newest message</span>
                    <label class="bfc-sw"><input type="checkbox" id="s-asc"${CFG.autoScroll?' checked':''}><span class="bfc-swt"></span></label>
                </div>

                <hr class="bfc-div">
                <span class="bfc-slbl">Interface</span>
                <div class="bfc-row">
                    <span>🙈 Hide this settings button</span>
                    <label class="bfc-sw"><input type="checkbox" id="s-hide"${CFG.hideGearBtn?' checked':''}><span class="bfc-swt"></span></label>
                </div>
                <p class="bfc-mention-note">When hidden, an "Open BFC Settings" button appears inside Torn's own chat settings panel (⚙ icon at the bottom of the chat).</p>

                <hr class="bfc-div">
                <span class="bfc-slbl">Status &amp; UI Colors</span>
                <div class="bfc-color-row"><span>🟢 Online</span><input type="color" id="s-con" value="${CFG.statusColors.online}"></div>
                <div class="bfc-color-row"><span>🟡 Idle</span><input type="color" id="s-cid" value="${CFG.statusColors.idle}"></div>
                <div class="bfc-color-row"><span>⚫ Offline</span><input type="color" id="s-cof" value="${CFG.statusColors.offline}"></div>
                <div class="bfc-color-row"><span>🔴 @Mention highlight</span><input type="color" id="s-cme" value="${CFG.mentionColor}"></div>
                <div class="bfc-color-row"><span>🔵 Accent / UI</span><input type="color" id="s-cac" value="${CFG.accentColor}"></div>

                <hr class="bfc-div">
                <button id="bfc-save-btn">💾 Save Settings</button>
                <div id="bfc-status-msg"></div>
            </div>
            <div id="bfc-credit">
                Developed by
                <a href="https://www.torn.com/profiles.php?XID=4141121" target="_blank" rel="noopener">sercann [4141121]</a>
            </div>
        `;
        document.body.appendChild(panel);

        applyGearVisibility();

        gearBtn.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('bfc-open'); });
        document.addEventListener('click', e => { if (!panel.contains(e.target) && e.target !== gearBtn) panel.classList.remove('bfc-open'); });

        document.getElementById('bfc-test-btn').addEventListener('click', async () => {
            const key = document.getElementById('s-key').value.trim();
            const btn = document.getElementById('bfc-test-btn');
            btn.textContent = '⏳ Testing…';
            try {
                const r = await fetch(`${API_BASE}/user/?selections=basic&key=${key}`);
                const d = await r.json();
                if (d.error) throw new Error(d.error.error);
                CFG.username = d.name;
                document.getElementById('bfc-disp-user').textContent = d.name;
                saveCfg(CFG);
                setMsg(`✓ Connected as: ${d.name}`, true);
                btn.textContent = '✓ Key valid';
            } catch(e) {
                setMsg(`✗ ${e.message}`, false);
                btn.textContent = '🔑 Test Key & Auto-detect Username';
            }
        });

        document.getElementById('bfc-save-btn').addEventListener('click', () => {
            CFG.apiKey          = document.getElementById('s-key').value.trim();
            CFG.refreshInterval = Math.max(30, parseInt(document.getElementById('s-ref').value) || 60);
            CFG.mentionEnabled  = document.getElementById('s-men').checked;
            CFG.showTimestamps  = document.getElementById('s-ts').checked;
            CFG.showTravelIcons = document.getElementById('s-travel').checked;
            CFG.showRankIcons   = document.getElementById('s-rank').checked;
            CFG.autoScroll      = document.getElementById('s-asc').checked;
            CFG.hideGearBtn     = document.getElementById('s-hide').checked;
            CFG.statusColors.online  = document.getElementById('s-con').value;
            CFG.statusColors.idle    = document.getElementById('s-cid').value;
            CFG.statusColors.offline = document.getElementById('s-cof').value;
            CFG.mentionColor    = document.getElementById('s-cme').value;
            CFG.accentColor     = document.getElementById('s-cac').value;

            autoScrollOn = CFG.autoScroll;
            saveCfg(CFG);
            applyGearVisibility();
            if (CFG.hideGearBtn) panel.classList.remove('bfc-open');
            startPoll();
            chatBoxEl = null;
            if (!CFG.hideGearBtn) setMsg('✓ Saved! Chat will refresh shortly.', true);
        });

        function setMsg(text, ok) {
            const el = document.getElementById('bfc-status-msg');
            if (!el) return;
            el.textContent = text; el.style.color = ok ? '#00e676' : CFG.mentionColor;
            setTimeout(() => { el.textContent = ''; }, 3000);
        }
    }

    function timeAgo(ts) {
        if (!ts) return '';
        const d = Math.floor(Date.now() / 1000 - ts);
        if (d < 5) return 'now'; if (d < 60) return d + 's';
        if (d < 3600) return Math.floor(d/60) + 'm'; if (d < 86400) return Math.floor(d/3600) + 'h';
        return Math.floor(d/86400) + 'd';
    }
    function capitalize(s)  { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
    function escRx(s)       { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function esc(s)         { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    if (CFG.apiKey) fetchMyUsername();
    buildSettingsPanel();
    runScanner();

    console.log(`[BFC] v${BFC_VERSION} by sercann loaded ✓`);
})();
