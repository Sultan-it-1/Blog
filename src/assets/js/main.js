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

    function legacyCopy(text) {
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

    // The Clipboard API can be denied (embedded browsers, permissions); fall back to the older method then.
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
        }
        return legacyCopy(text);
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

    // ---- Self-test questions: one box, one question at a time (the markup is rendered at build time) ----
    document.querySelectorAll('[data-quiz-deck]').forEach((deck) => {
        // A comprehensive test holds every question in a series, and asks a random few of them.
        const pool = [...deck.querySelectorAll('[data-quiz]')];
        const start = deck.querySelector('[data-quiz-start]');
        const answered = new Map();
        let quizzes = pool;
        let current = 0;

        const allOptions = (quiz) => [...quiz.querySelectorAll('.quiz-option')];
        const isCorrect = (option) => 'correct' in option.dataset;

        const nav = document.createElement('div');
        const previous = document.createElement('button');
        const next = document.createElement('button');
        const summary = document.createElement('div');
        const summaryText = document.createElement('p');
        const retry = document.createElement('button');
        nav.className = 'quiz-nav';
        previous.type = next.type = retry.type = 'button';
        previous.className = retry.className = 'btn';
        next.className = 'btn btn-primary';
        previous.textContent = deck.dataset.previous;
        retry.textContent = deck.dataset.retry;
        summary.className = 'quiz-summary';
        summary.hidden = true;
        summaryText.setAttribute('role', 'status');
        nav.append(previous, next);
        summary.append(summaryText, retry);
        deck.append(nav, summary);

        const bringIntoView = () => {
            if (deck.getBoundingClientRect().top < 0) {
                deck.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
            }
        };

        const show = (index) => {
            current = index;
            pool.forEach((quiz) => {
                quiz.hidden = quiz !== quizzes[index];
            });
            previous.hidden = index === 0;
            next.textContent = index === quizzes.length - 1 ? deck.dataset.finish : deck.dataset.next;
            next.disabled = !answered.has(quizzes[index]);
            nav.hidden = false;
            summary.hidden = true;
        };

        const reveal = (quiz, chosen) => {
            const right = chosen.every(isCorrect);
            allOptions(quiz).forEach((option) => {
                option.setAttribute('aria-disabled', 'true');
                option.classList.toggle('is-correct', isCorrect(option));
                option.classList.toggle('is-wrong', chosen.includes(option) && !isCorrect(option));
            });
            const result = quiz.querySelector('.quiz-result');
            result.textContent = right ? deck.dataset.right : deck.dataset.wrong;
            result.classList.toggle('is-right', right);
            result.classList.toggle('is-wrong', !right);
            quiz.querySelector('.quiz-answer').open = true;
            answered.set(quiz, right);
            next.disabled = false;
        };

        pool.forEach((quiz) => {
            const options = allOptions(quiz);
            const pick = Number(quiz.dataset.pick);
            options.forEach((option) => {
                option.disabled = false;
                option.setAttribute('aria-pressed', 'false');
                option.addEventListener('click', () => {
                    if (answered.has(quiz)) return;
                    const pressed = option.getAttribute('aria-pressed') === 'true';
                    option.setAttribute('aria-pressed', String(!pressed));
                    const chosen = options.filter((item) => item.getAttribute('aria-pressed') === 'true');
                    if (chosen.length === pick) reveal(quiz, chosen);
                });
            });
        });

        previous.addEventListener('click', () => {
            show(current - 1);
            quizzes[current].focus({ preventScroll: true });
            bringIntoView();
        });

        next.addEventListener('click', () => {
            if (current < quizzes.length - 1) {
                show(current + 1);
                quizzes[current].focus({ preventScroll: true });
            } else {
                const total = [...answered.values()].filter(Boolean).length;
                summaryText.textContent = deck.dataset.score.replace('{score}', total).replace('{total}', quizzes.length);
                quizzes[current].hidden = true;
                nav.hidden = true;
                summary.hidden = false;
                retry.focus({ preventScroll: true });
            }
            bringIntoView();
        });

        retry.addEventListener('click', () => {
            answered.clear();
            quizzes.forEach((quiz) => {
                allOptions(quiz).forEach((option) => {
                    option.setAttribute('aria-pressed', 'false');
                    option.removeAttribute('aria-disabled');
                    option.classList.remove('is-correct', 'is-wrong');
                });
                const result = quiz.querySelector('.quiz-result');
                result.textContent = '';
                result.classList.remove('is-right', 'is-wrong');
                quiz.querySelector('.quiz-answer').open = false;
            });
            if (start) {
                openStart();
            } else {
                show(0);
                quizzes[0].focus({ preventScroll: true });
            }
            bringIntoView();
        });

        const openStart = () => {
            pool.forEach((quiz) => {
                quiz.hidden = true;
            });
            nav.hidden = true;
            summary.hidden = true;
            start.hidden = false;
        };

        start?.querySelectorAll('[data-quiz-size]').forEach((button) => {
            button.addEventListener('click', () => {
                const shuffled = [...pool];
                for (let i = shuffled.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                quizzes = shuffled.slice(0, Number(button.dataset.quizSize));
                quizzes.forEach((quiz, i) => {
                    quiz.querySelector('.quiz-number').textContent = deck.dataset.number
                        .replace('{n}', i + 1)
                        .replace('{total}', quizzes.length);
                });
                start.hidden = true;
                show(0);
                quizzes[0].focus({ preventScroll: true });
                bringIntoView();
            });
        });

        deck.classList.add('is-stepped');
        deck.classList.remove('is-waiting');
        if (start) {
            openStart();
        } else {
            show(0);
        }
    });

    // ---- Highlighter: select text in an article and colour it, the way you'd mark up a book ----
    // Kept per page in this browser, as positions in the article's text plus the text itself, so
    // highlights survive a small edit to the article. Their colours are theme tokens (see main.css).
    const article = document.querySelector('[data-highlightable]');
    const highlightBar = document.querySelector('[data-highlight-bar]');
    if (article && highlightBar) {
        const storageKey = `highlights:${location.pathname}`;
        const coarsePointer = window.matchMedia('(pointer: coarse)');
        const removeButton = highlightBar.querySelector('[data-highlight-remove]');
        const swatches = [...highlightBar.querySelectorAll('[data-highlight-color]')];
        const skipped = 'svg, .quiz-deck, .quiz-intro, .code-bar, .heading-anchor';
        const wordCharacter = /[\p{L}\p{N}\p{M}_-]/u;
        let highlights = [];
        let target = null; // What the bar acts on: { start, end, anchor }. The anchor is a Range or a <mark>.
        let pointerDown = false;
        let selectionTimer = null;

        const textNodes = () => {
            const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => (node.parentElement.closest(skipped) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
            });
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            return nodes;
        };
        const articleText = () => textNodes().map((node) => node.data).join('');

        const load = () => {
            let saved = [];
            try {
                saved = JSON.parse(localStorage.getItem(storageKey)) || [];
            } catch (e) {
                // Storage blocked or damaged: start with none.
            }
            const text = articleText();
            highlights = saved.flatMap((highlight) => {
                if (text.slice(highlight.start, highlight.end) === highlight.text) return [highlight];
                // The article changed: find the same words again, or let the highlight go.
                const start = text.indexOf(highlight.text);
                return start < 0 ? [] : [{ ...highlight, start, end: start + highlight.text.length }];
            });
        };

        const save = () => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(highlights));
            } catch (e) {
                // Storage blocked (private mode): the highlights last for this page only.
            }
        };

        const render = () => {
            article.querySelectorAll('mark[data-highlight]').forEach((mark) => mark.replaceWith(...mark.childNodes));
            article.normalize();
            let position = 0;
            textNodes().forEach((node) => {
                const nodeStart = position;
                const nodeEnd = nodeStart + node.length;
                position = nodeEnd;
                // From the end of the node backwards, so splitting leaves the earlier text in `node`.
                highlights
                    .map((highlight, index) => ({ ...highlight, index }))
                    .filter((highlight) => highlight.start < nodeEnd && highlight.end > nodeStart)
                    .sort((a, b) => b.start - a.start)
                    .forEach((highlight) => {
                        const from = Math.max(highlight.start, nodeStart) - nodeStart;
                        const to = Math.min(highlight.end, nodeEnd) - nodeStart;
                        // The spaces between table cells or paragraphs can't hold a <mark>.
                        if (!node.data.slice(from, to).trim()) return;
                        const piece = from ? node.splitText(from) : node;
                        if (to - from < piece.length) piece.splitText(to - from);
                        const mark = document.createElement('mark');
                        mark.className = `hl hl-${highlight.color}`;
                        mark.dataset.highlight = highlight.index;
                        piece.replaceWith(mark);
                        mark.append(piece);
                    });
            });
        };

        // The article's text the range covers, trimmed of spaces and grown to whole words,
        // because a mark through the middle of an Arabic word looks broken.
        const selectedStretch = (range) => {
            let position = 0;
            let start = null;
            let end = null;
            textNodes().forEach((node) => {
                if (range.intersectsNode(node)) {
                    const from = node === range.startContainer ? range.startOffset : 0;
                    const to = node === range.endContainer ? range.endOffset : node.length;
                    if (to > from) {
                        if (start === null) start = position + from;
                        end = position + to;
                    }
                }
                position += node.length;
            });
            if (start === null) return null;
            const text = articleText();
            while (start < end && /\s/.test(text[start])) start += 1;
            while (end > start && /\s/.test(text[end - 1])) end -= 1;
            if (start === end) return null;
            while (start > 0 && wordCharacter.test(text[start - 1])) start -= 1;
            while (end < text.length && wordCharacter.test(text[end])) end += 1;
            return { start, end };
        };

        const place = () => {
            if (coarsePointer.matches) {
                highlightBar.style.top = '';
                highlightBar.style.left = '';
                return;
            }
            const box = target.anchor.getBoundingClientRect();
            const width = highlightBar.offsetWidth;
            const height = highlightBar.offsetHeight;
            const above = box.top - height - 8;
            const top = above >= 8 ? above : Math.max(8, Math.min(box.bottom + 8, window.innerHeight - height - 8));
            const left = Math.min(Math.max(8, box.left + box.width / 2 - width / 2), root.clientWidth - width - 8);
            highlightBar.style.top = `${top}px`;
            highlightBar.style.left = `${left}px`;
        };

        const openBar = (start, end, anchor) => {
            target = { start, end, anchor };
            const exact = highlights.find((highlight) => highlight.start === start && highlight.end === end);
            swatches.forEach((swatch) => {
                swatch.setAttribute('aria-pressed', String(exact?.color === swatch.dataset.highlightColor));
            });
            removeButton.hidden = !highlights.some((highlight) => highlight.start < end && highlight.end > start);
            highlightBar.hidden = false;
            place();
        };

        const closeBar = () => {
            target = null;
            highlightBar.hidden = true;
        };

        const checkSelection = () => {
            if (pointerDown) return;
            const selection = window.getSelection();
            const range = selection.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0) : null;
            const stretch = range && range.intersectsNode(article) ? selectedStretch(range) : null;
            if (stretch) openBar(stretch.start, stretch.end, range.cloneRange());
            else if (target?.anchor instanceof Range) closeBar();
        };

        document.addEventListener('selectionchange', () => {
            clearTimeout(selectionTimer);
            selectionTimer = setTimeout(checkSelection, 150);
        });

        // With a mouse, wait until the drag ends instead of chasing it.
        document.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && !highlightBar.contains(event.target)) pointerDown = true;
        });
        ['pointerup', 'pointercancel'].forEach((type) => {
            document.addEventListener(type, () => {
                if (!pointerDown) return;
                pointerDown = false;
                checkSelection();
            });
        });

        // Tapping a highlight offers its colours and the remove button. Links inside one still work.
        document.addEventListener('click', (event) => {
            if (highlightBar.contains(event.target)) return;
            const mark = event.target.closest('mark[data-highlight]');
            if (mark && !event.target.closest('a') && window.getSelection().isCollapsed) {
                const highlight = highlights[mark.dataset.highlight];
                openBar(highlight.start, highlight.end, mark);
            } else if (target && !(target.anchor instanceof Range)) {
                closeBar();
            }
        });

        // Pressing a colour shouldn't clear the selection before it's used.
        highlightBar.addEventListener('mousedown', (event) => event.preventDefault());

        highlightBar.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button || !target) return;
            const { start, end } = target;
            const text = articleText();
            // The new colour replaces whatever it covers; the parts of older highlights outside it stay.
            highlights = highlights.flatMap((highlight) => {
                if (highlight.end <= start || highlight.start >= end) return [highlight];
                const parts = [];
                if (highlight.start < start) parts.push({ ...highlight, end: start, text: text.slice(highlight.start, start) });
                if (highlight.end > end) parts.push({ ...highlight, start: end, text: text.slice(end, highlight.end) });
                return parts;
            });
            if (button.dataset.highlightColor) {
                highlights.push({ start, end, color: button.dataset.highlightColor, text: text.slice(start, end) });
            }
            save();
            closeBar();
            window.getSelection().removeAllRanges();
            render();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && target) closeBar();
        });
        ['scroll', 'resize'].forEach((type) => {
            window.addEventListener(type, () => {
                if (target) place();
            }, { passive: true });
        });

        document.querySelector('[data-highlight-hint]')?.removeAttribute('hidden');
        load();
        if (highlights.length) render();
    }

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
