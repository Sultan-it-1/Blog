// Site behaviour, loaded with `defer` on every page.
// Interface text comes from data-* attributes set per language by the layouts.
(() => {
    const root = document.documentElement;
    const body = document.body;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // ---- Theme: follows the system until the reader picks one ----
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const current = root.getAttribute('data-theme') || (prefersDark.matches ? 'dark' : 'light');
            const next = current === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try {
                localStorage.setItem('theme', next);
            } catch (e) {
                // Storage blocked (private mode): the choice lasts for this page only.
            }
        });
    });

    // ---- Navigation indicator ----
    // The pill's leading edge travels on a snappy spring and its trailing edge on a softer one,
    // so it stretches towards its target and settles (see .nav-indicator in main.css).
    const navList = document.querySelector('[data-nav-links]');
    const indicator = document.querySelector('[data-nav-indicator]');
    if (navList && indicator) {
        const links = [...navList.querySelectorAll('.nav-link')];
        const current = links.find((link) => link.getAttribute('aria-current') === 'page');
        let lastLeft = null;

        const moveTo = (link) => {
            if (!link) {
                indicator.style.opacity = '0';
                return;
            }
            const listBox = navList.getBoundingClientRect();
            const box = link.getBoundingClientRect();
            const left = box.left - listBox.left;
            const right = listBox.right - box.right;
            if (lastLeft !== null) {
                indicator.classList.toggle('moves-right', left > lastLeft);
                indicator.classList.toggle('moves-left', left <= lastLeft);
            }
            indicator.style.setProperty('--indicator-left', `${left}px`);
            indicator.style.setProperty('--indicator-right', `${right}px`);
            indicator.style.opacity = '';
            lastLeft = left;
        };

        const place = () => {
            indicator.classList.remove('is-ready');
            moveTo(current);
            requestAnimationFrame(() => indicator.classList.add('is-ready'));
        };

        navList.classList.add('has-indicator');
        place();
        links.forEach((link) => {
            link.addEventListener('pointerenter', () => moveTo(link));
            link.addEventListener('focus', () => moveTo(link));
        });
        navList.addEventListener('pointerleave', () => moveTo(current));
        navList.addEventListener('focusout', (event) => {
            if (!navList.contains(event.relatedTarget)) moveTo(current);
        });
        window.addEventListener('resize', place);
        document.fonts?.ready.then(place);
    }

    // ---- Mobile menu ----
    const menuButton = document.querySelector('[data-menu-toggle]');
    const nav = document.querySelector('[data-nav]');

    function setMenu(open) {
        nav.classList.toggle('is-open', open);
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? menuButton.dataset.labelClose : menuButton.dataset.labelOpen);
        body.style.overflow = open ? 'hidden' : '';
    }

    if (menuButton && nav) {
        menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
        nav.addEventListener('click', (event) => {
            if (event.target.closest('a')) setMenu(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && nav.classList.contains('is-open')) {
                setMenu(false);
                menuButton.focus();
            }
        });
        window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
            if (event.matches) setMenu(false);
        });
    }

    // ---- Scroll: header hides on the way down, reading progress, back-to-top ----
    const header = document.querySelector('[data-header]');
    const progress = document.querySelector('[data-progress]');
    const backToTop = document.querySelector('[data-back-to-top]');
    let lastY = window.scrollY;
    let ticking = false;

    if (backToTop) {
        backToTop.hidden = false;
        backToTop.addEventListener('click', () =>
            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' })
        );
    }

    function onScroll() {
        const y = window.scrollY;
        const scrollable = root.scrollHeight - window.innerHeight;
        if (progress) progress.style.setProperty('--progress', scrollable > 0 ? (y / scrollable).toFixed(4) : '0');
        if (backToTop) backToTop.classList.toggle('is-visible', y > 600);
        if (header && !nav?.classList.contains('is-open')) {
            header.classList.toggle('is-hidden', y > lastY && y > 160);
        }
        lastY = y;
        ticking = false;
    }

    window.addEventListener(
        'scroll',
        () => {
            if (!ticking) {
                requestAnimationFrame(onScroll);
                ticking = true;
            }
        },
        { passive: true }
    );
    onScroll();

    // ---- Table of contents: highlight the section being read ----
    const tocLinks = [...document.querySelectorAll('[data-toc] a')];
    if (tocLinks.length && 'IntersectionObserver' in window) {
        const byId = new Map(tocLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
        const headings = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
        const visible = new Set();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
                // The active section is the last heading above the reading line.
                const line = window.innerHeight * 0.3;
                let active = headings[0];
                for (const heading of headings) {
                    if (heading.getBoundingClientRect().top <= line) active = heading;
                }
                tocLinks.forEach((link) => link.classList.toggle('is-active', byId.get(active.id) === link));
            },
            { rootMargin: '0px 0px -60% 0px' }
        );
        headings.forEach((heading) => observer.observe(heading));
    }

    // ---- Code blocks: copy button (the markup is rendered at build time) ----
    const copiedLabel = body.dataset.copied || 'Copied';
    const failedLabel = body.dataset.copyFailed || 'Copy failed';

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        return new Promise((resolve, reject) => {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            body.append(area);
            area.select();
            const ok = document.execCommand('copy');
            area.remove();
            ok ? resolve() : reject(new Error('execCommand copy failed'));
        });
    }

    document.querySelectorAll('[data-copy]').forEach((button) => {
        const label = button.querySelector('.copy-label');
        const idleLabel = label.textContent;
        const code = button.closest('.code-block').querySelector('pre');
        button.hidden = false;
        button.addEventListener('click', () => {
            copyText(code.textContent.replace(/\n$/, ''))
                .then(() => {
                    button.classList.add('is-copied');
                    label.textContent = copiedLabel;
                })
                .catch(() => {
                    label.textContent = failedLabel;
                })
                .finally(() => {
                    setTimeout(() => {
                        button.classList.remove('is-copied');
                        label.textContent = idleLabel;
                    }, 1800);
                });
        });
    });

    // ---- Blog search: filters the rows already on the page ----
    const searchInput = document.querySelector('[data-search-input]');
    if (searchInput) {
        const rows = [...document.querySelectorAll('[data-search-list] [data-search]')];
        const groups = [...document.querySelectorAll('[data-year-group]')];
        const empty = document.querySelector('[data-search-empty]');
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            let shown = 0;
            rows.forEach((row) => {
                const match = !query || row.dataset.search.includes(query);
                row.hidden = !match;
                if (match) shown += 1;
            });
            groups.forEach((group) => {
                group.hidden = !group.querySelector('[data-search]:not([hidden])');
            });
            if (empty) empty.hidden = shown > 0;
        });
        if (location.hash === '#search') searchInput.focus();
    }

    // ---- 404: show the path that was requested ----
    const missingPath = document.querySelector('[data-404-path]');
    if (missingPath) missingPath.textContent = location.pathname;

    // ---- Hero terminal ----
    // seek(t) draws the session as it looks t seconds in. Every character, line and the caret
    // are computed from t alone, so any moment can be rendered directly, in any order.
    const terminal = document.querySelector('[data-terminal]');
    if (terminal) {
        const bodyEl = terminal.querySelector('[data-terminal-body]');
        const lines = JSON.parse(terminal.querySelector('[data-terminal-script]').textContent);
        const MAX_LINES = 11;
        const CHAR = 0.038; // seconds per typed character
        const BEFORE_CMD = 0.45; // pause at an empty prompt
        const AFTER_CMD = 0.35; // pause between Enter and output
        const OUTPUT_GAP = 0.09; // between output lines
        const HOLD = 3.2; // finished session stays on screen

        // Precompute when each line starts and finishes.
        let clock = 0.6;
        const timeline = lines.map((line) => {
            if (line.cmd) {
                const start = clock + BEFORE_CMD;
                const end = start + line.cmd.length * CHAR;
                clock = end + AFTER_CMD;
                return { ...line, start, end };
            }
            const start = clock;
            clock = start + OUTPUT_GAP;
            return { ...line, start, end: start };
        });
        const duration = clock + HOLD;

        const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const clamp01 = (x) => Math.max(0, Math.min(1, x));

        let lastFrame = '';
        function seek(time) {
            const t = ((time % duration) + duration) % duration;
            const out = [];
            let typing = false;
            for (const line of timeline) {
                if (t < line.start) break;
                if (line.cmd) {
                    const shown = Math.floor(clamp01((t - line.start) / (line.end - line.start)) * line.cmd.length);
                    typing = t < line.end;
                    out.push({ prompt: true, text: line.cmd.slice(0, shown), active: typing });
                } else {
                    out.push({ prompt: false, text: line.out, tone: line.tone });
                }
            }
            // An idle prompt waits after the last finished command or output.
            if (!typing) out.push({ prompt: true, text: '', active: true });

            const caretOn = typing || Math.floor(t / 0.55) % 2 === 0;
            const html = out
                .slice(-MAX_LINES)
                .map((line) => {
                    if (!line.prompt) {
                        return `<span class="t-out${line.tone ? ` t-${line.tone}` : ''}">${escape(line.text)}</span>`;
                    }
                    const caret = line.active ? `<span class="t-caret${caretOn ? '' : ' is-off'}"></span>` : '';
                    return `<span class="t-prompt">$</span> ${escape(line.text)}${caret}`;
                })
                .join('\n');
            if (html !== lastFrame) {
                bodyEl.innerHTML = html;
                lastFrame = html;
            }
        }

        terminal.seek = seek;
        terminal.duration = duration;

        if (!reducedMotion.matches) {
            terminal.classList.add('is-driven');
            let startedAt = null;
            let frame = 0;
            let onScreen = true;

            const tick = (now) => {
                if (startedAt === null) startedAt = now;
                seek((now - startedAt) / 1000);
                frame = onScreen && !terminal.dataset.paused ? requestAnimationFrame(tick) : 0;
            };

            new IntersectionObserver(([entry]) => {
                onScreen = entry.isIntersecting;
                if (onScreen && !frame && !terminal.dataset.paused) frame = requestAnimationFrame(tick);
            }).observe(terminal);
        }
    }
})();
