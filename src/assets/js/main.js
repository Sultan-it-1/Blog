// Site behaviour, loaded with `defer` on every page.
// Interface text comes from data-* attributes on <body>, set per language by the layout.
(() => {
    const root = document.documentElement;
    const body = document.body;

    // ---- Theme: dark by default; the <head> script applies a saved "light" before paint ----
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            if (next === 'dark') root.setAttribute('data-theme', 'dark');
            else root.removeAttribute('data-theme');
            try {
                localStorage.setItem('theme', next);
            } catch (e) {
                // Storage blocked (private mode): the choice lasts for this page only.
            }
        });
    });

    // ---- Mobile menu ----
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('siteNav');

    function setMenu(open) {
        nav.classList.toggle('is-open', open);
        menuToggle.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        body.style.overflow = open ? 'hidden' : '';
    }

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
        // Close on a link click or a click on the dimmed backdrop.
        nav.addEventListener('click', (event) => {
            if (event.target === nav || event.target.closest('a')) setMenu(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setMenu(false);
        });
    }

    // ---- Reading progress, back-to-top, header that hides while scrolling down ----
    const header = document.getElementById('siteHeader');

    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    body.append(progress);

    const backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.className = 'back-to-top';
    backToTop.textContent = '🔝';
    backToTop.setAttribute('aria-label', body.dataset.backToTop || 'Back to top');
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    body.append(backToTop);

    let lastScrollY = window.scrollY;
    let ticking = false;

    function onScroll() {
        const y = window.scrollY;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = scrollable > 0 ? `${(y / scrollable) * 100}%` : '0';
        backToTop.classList.toggle('show', y > 300);
        if (header && !nav?.classList.contains('is-open')) {
            header.classList.toggle('is-hidden', y > lastScrollY && y > 100);
        }
        lastScrollY = y;
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

    // ---- Code blocks: language label + copy button ----
    const LANGUAGE_NAMES = {
        bash: 'Bash',
        sh: 'Shell',
        shell: 'Shell',
        powershell: 'PowerShell',
        ini: 'INI',
        yaml: 'YAML',
        json: 'JSON',
        js: 'JavaScript',
        javascript: 'JavaScript',
        ts: 'TypeScript',
        python: 'Python',
        html: 'HTML',
        css: 'CSS',
        sql: 'SQL',
        docker: 'Dockerfile',
        nginx: 'Nginx',
        text: 'Text',
    };

    const copyLabel = body.dataset.copy || 'Copy';
    const copiedLabel = body.dataset.copied || 'Copied!';
    const failedLabel = body.dataset.copyFailed || 'Copy failed';

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        // Fallback for plain-http previews.
        return new Promise((resolve, reject) => {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            body.append(area);
            area.select();
            const ok = document.execCommand('copy');
            area.remove();
            if (ok) resolve();
            else reject(new Error('execCommand copy failed'));
        });
    }

    document.querySelectorAll('.prose pre').forEach((pre) => {
        const language = (pre.className.match(/language-([\w-]+)/) || [])[1] || 'text';

        const block = document.createElement('div');
        block.className = 'code-block';

        const head = document.createElement('div');
        head.className = 'code-header';

        const name = document.createElement('span');
        name.className = 'code-lang';
        name.textContent = LANGUAGE_NAMES[language] || language;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'copy-btn';
        button.textContent = copyLabel;
        button.addEventListener('click', () => {
            copyText(pre.textContent.replace(/\n$/, ''))
                .then(() => {
                    button.textContent = copiedLabel;
                    button.classList.add('copied');
                })
                .catch(() => {
                    button.textContent = failedLabel;
                })
                .finally(() => {
                    setTimeout(() => {
                        button.textContent = copyLabel;
                        button.classList.remove('copied');
                    }, 2000);
                });
        });

        head.append(name, button);
        pre.before(block);
        block.append(head, pre);
    });

    // ---- Blog search: filters the cards already on the page ----
    const searchInput = document.querySelector('[data-search-input]');
    if (searchInput) {
        const cards = [...document.querySelectorAll('[data-search-list] > [data-search]')];
        const empty = document.querySelector('[data-search-empty]');
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            let shown = 0;
            cards.forEach((card) => {
                const match = !query || card.dataset.search.includes(query);
                card.hidden = !match;
                if (match) shown += 1;
            });
            if (empty) empty.hidden = shown > 0;
        });
    }
})();
