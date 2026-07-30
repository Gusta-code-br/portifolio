/* =============================================================
   MOTION ENGINE — Gustavo Cruz
   Sistema de animação: preloader, cursor, reveals, split-text,
   tilt 3D, spotlight, parallax, rede de partículas, narrativa
   pinned e barra de progresso.
   ============================================================= */
(() => {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const lerp = (a, b, n) => a + (b - a) * n;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const el = (tag, cls, html) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    };

    /* ---------------------------------------------------------
       Loop central de rAF (um só para tudo)
    --------------------------------------------------------- */
    const ticks = [];
    const onTick = fn => ticks.push(fn);
    let rafId;
    const loop = () => {
        for (let i = 0; i < ticks.length; i++) ticks[i]();
        rafId = requestAnimationFrame(loop);
    };

    /* =========================================================
       1. AMBIÊNCIA DE FUNDO
    ========================================================= */
    function buildAmbience() {
        const bg = el('div', 'fx-bg');
        bg.innerHTML =
            '<div class="fx-aurora a1"></div>' +
            '<div class="fx-aurora a2"></div>' +
            '<div class="fx-aurora a3"></div>' +
            '<div class="fx-grid"></div>' +
            '<div class="fx-spot"></div>' +
            '<div class="fx-grain"></div>';
        document.body.appendChild(bg);
        return bg.querySelector('.fx-spot');
    }

    /* =========================================================
       2. REDE DE PARTÍCULAS (canvas no hero)
    ========================================================= */
    function particleNet(host) {
        if (REDUCED || !host) return;
        const cv = el('canvas', 'fx-net');
        host.prepend(cv);
        const ctx = cv.getContext('2d', { alpha: true });
        const DPR = Math.min(window.devicePixelRatio || 1, 2);
        let W = 0, H = 0, pts = [], mouse = { x: -9999, y: -9999 };

        const resize = () => {
            const r = host.getBoundingClientRect();
            W = r.width; H = r.height;
            cv.width = W * DPR; cv.height = H * DPR;
            cv.style.width = W + 'px'; cv.style.height = H + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            const density = Math.round(clamp((W * H) / 16000, 26, 90));
            pts = Array.from({ length: density }, () => ({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - .5) * .28,
                vy: (Math.random() - .5) * .28,
                r: Math.random() * 1.6 + .5
            }));
        };

        host.addEventListener('pointermove', e => {
            const r = host.getBoundingClientRect();
            mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
        });
        host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

        let visible = true;
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(host);

        const draw = () => {
            if (!visible || !W) return;
            ctx.clearRect(0, 0, W, H);

            for (const p of pts) {
                // leve atração pelo cursor
                const dxm = mouse.x - p.x, dym = mouse.y - p.y;
                const dm = Math.hypot(dxm, dym);
                if (dm < 170) { p.vx += (dxm / dm) * .0055; p.vy += (dym / dm) * .0055; }

                p.x += p.vx; p.y += p.vy;
                p.vx *= .992; p.vy *= .992;
                if (p.vx * p.vx + p.vy * p.vy < .002) {
                    p.vx += (Math.random() - .5) * .02;
                    p.vy += (Math.random() - .5) * .02;
                }
                if (p.x < 0 || p.x > W) p.vx *= -1;
                if (p.y < 0 || p.y > H) p.vy *= -1;
                p.x = clamp(p.x, 0, W); p.y = clamp(p.y, 0, H);

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, 6.2832);
                ctx.fillStyle = 'rgba(167,139,250,.42)';
                ctx.fill();
            }

            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const a = pts[i], b = pts[j];
                    const d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d < 128) {
                        const near = Math.hypot(mouse.x - a.x, mouse.y - a.y) < 190;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = near
                            ? `rgba(124,106,247,${(1 - d / 128) * .42})`
                            : `rgba(140,130,200,${(1 - d / 128) * .13})`;
                        ctx.lineWidth = near ? 1 : .7;
                        ctx.stroke();
                    }
                }
            }
        };

        resize();
        window.addEventListener('resize', resize);
        onTick(draw);
    }

    /* =========================================================
       3. CURSOR CUSTOMIZADO
    ========================================================= */
    function customCursor(spot) {
        if (!FINE_POINTER || REDUCED) return;
        document.body.classList.add('has-pointer');
        const dot  = el('div', 'cur-dot');
        const ring = el('div', 'cur-ring', '<span class="cur-label">ver</span>');
        document.body.append(dot, ring);

        let mx = innerWidth / 2, my = innerHeight / 2;
        let rx = mx, ry = my, sx = mx, sy = my;

        addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
        addEventListener('pointerdown', () => document.body.classList.add('cur-down'));
        addEventListener('pointerup',   () => document.body.classList.remove('cur-down'));
        document.addEventListener('mouseleave', () => document.body.classList.add('cur-hidden'));
        document.addEventListener('mouseenter', () => document.body.classList.remove('cur-hidden'));

        // Estados por elemento
        const LINK = 'a, button, input, textarea, .skill-chip, .stack-pill, .p-step, .channel-item';
        document.addEventListener('pointerover', e => {
            const t = e.target;
            if (t.closest && t.closest('[data-cur="view"]')) {
                document.body.classList.add('cur-view');
                const lbl = t.closest('[data-cur="view"]').dataset.curLabel;
                if (lbl) ring.querySelector('.cur-label').textContent = lbl;
            } else if (t.closest && t.closest(LINK)) {
                document.body.classList.add('cur-link');
            }
        });
        document.addEventListener('pointerout', e => {
            const t = e.target;
            if (t.closest && t.closest('[data-cur="view"]')) document.body.classList.remove('cur-view');
            if (t.closest && t.closest(LINK)) document.body.classList.remove('cur-link');
        });

        onTick(() => {
            dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
            rx = lerp(rx, mx, .18); ry = lerp(ry, my, .18);
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
            if (spot) {
                sx = lerp(sx, mx, .055); sy = lerp(sy, my, .055);
                spot.style.setProperty('--sx', sx + 'px');
                spot.style.setProperty('--sy', sy + 'px');
            }
        });
    }

    /* =========================================================
       4. SPLIT TEXT (por palavra, preservando <br>, <em>, <strong>)
    ========================================================= */
    function splitText(node) {
        if (node.dataset.split === 'done') return;
        node.dataset.split = 'done';
        let idx = 0;

        const walk = parent => {
            Array.from(parent.childNodes).forEach(child => {
                if (child.nodeType === 3) {
                    const words = child.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    words.forEach(w => {
                        if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
                        const outer = el('span', 'sw');
                        const inner = el('i', null, w);
                        inner.style.setProperty('--d', (idx++ * 0.045) + 's');
                        outer.appendChild(inner);
                        frag.appendChild(outer);
                    });
                    parent.replaceChild(frag, child);
                } else if (child.nodeType === 1 && child.tagName !== 'BR') {
                    walk(child);
                }
            });
        };
        walk(node);
    }

    /* =========================================================
       5. REVEAL ENGINE — atribuição automática + stagger
    ========================================================= */
    function revealEngine() {
        // Marca elementos automaticamente
        const auto = [
            ['.sec-label',                'up',    0],
            ['.sec-desc',                 'up',   .12],
            ['.about-text',               'up',   .06],
            ['.skills-wrap',              'up',   .1],
            ['.proj-featured',            'blur',  0],
            ['.tl-item',                  'left',  0],
            ['.contact-form-wrap',        'right', 0],
            ['.contact-channels',         'left',  0],
            ['.channel-item',             'up',    0],
            ['.marquee',                  'scale', 0],
            ['.hero-card',                'scale', 0],
            ['.process-rail',             'left',  0],
            ['.process-stage',            'scale', 0],
            ['footer .inner, footer',     'up',    0]
        ];
        auto.forEach(([sel, kind, delay]) => {
            $$(sel).forEach((n, i) => {
                if (n.hasAttribute('data-reveal')) return;
                n.setAttribute('data-reveal', kind);
                n.style.setProperty('--d', (delay + i * 0.08) + 's');
            });
        });

        // Títulos com split
        $$('.sec-title, .hero h1').forEach(h => {
            splitText(h);
            h.setAttribute('data-reveal', 'none');
            h.style.opacity = '1';
        });

        // Stagger interno de listas
        $$('.skills-wrap').forEach(w => {
            $$('.skill-chip', w).forEach((c, i) => {
                c.setAttribute('data-reveal', 'scale');
                c.style.setProperty('--d', (i * 0.035) + 's');
            });
        });
        $$('.proj-tags').forEach(w => {
            $$('.proj-tag', w).forEach((c, i) => c.style.setProperty('--d', (i * 0.03) + 's'));
        });

        // Cards com tilt/spotlight
        $$('.proj-featured, .channel-item, .stat-item').forEach(c => c.classList.add('fx-card'));

        const targets = $$('[data-reveal], [data-clip], [data-split="done"]');
        if (!('IntersectionObserver' in window)) {
            targets.forEach(t => t.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        targets.forEach(t => io.observe(t));
    }

    /* =========================================================
       6. TILT 3D + SPOTLIGHT
    ========================================================= */
    function tiltCards() {
        if (!FINE_POINTER || REDUCED) return;
        $$('.fx-card').forEach(card => {
            const strength = card.classList.contains('proj-featured') ? 3.2 : 7;
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                card.classList.add('is-tilting');
                card.style.setProperty('--px', (px * 100) + '%');
                card.style.setProperty('--py', (py * 100) + '%');
                card.style.setProperty('--ry', ((px - .5) * strength).toFixed(2) + 'deg');
                card.style.setProperty('--rx', ((.5 - py) * strength).toFixed(2) + 'deg');
            });
            card.addEventListener('pointerleave', () => {
                card.classList.remove('is-tilting');
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
        });

        // Card do hero reage ao mouse global
        const hero = $('.hero'), hcard = $('.hero-card');
        if (hero && hcard) {
            hero.addEventListener('pointermove', e => {
                const r = hero.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - .5;
                const py = (e.clientY - r.top) / r.height - .5;
                hcard.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
                hcard.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
            });
            hero.addEventListener('pointerleave', () => {
                hcard.style.setProperty('--rx', '0deg');
                hcard.style.setProperty('--ry', '0deg');
            });
        }
    }

    /* =========================================================
       7. BOTÕES MAGNÉTICOS
    ========================================================= */
    function magnetic() {
        if (!FINE_POINTER || REDUCED) return;
        $$('.btn-main, .btn-ghost, .btn-submit, .nav-cta, .iframe-overlay-btn').forEach(b => {
            b.addEventListener('pointermove', e => {
                const r = b.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width / 2) * .28;
                const y = (e.clientY - r.top - r.height / 2) * .38;
                b.style.setProperty('--mx', x.toFixed(1) + 'px');
                b.style.setProperty('--my', y.toFixed(1) + 'px');
            });
            b.addEventListener('pointerleave', () => {
                b.style.setProperty('--mx', '0px');
                b.style.setProperty('--my', '0px');
            });
        });
    }

    /* =========================================================
       8. SCROLL: progresso, navbar, link ativo, parallax, timeline
    ========================================================= */
    function scrollSystem() {
        const bar  = el('div', 'fx-progress');
        const top  = el('button', 'to-top', '<i class="fas fa-arrow-up"></i>');
        top.setAttribute('aria-label', 'Voltar ao topo');
        document.body.append(bar, top);

        const nav = $('.navbar');
        const heroInner = $('.hero-inner > div:first-child');
        const timeline = $('.timeline');
        const sections = $$('section[id]');
        const navLinks = $$('.nav-links a[href^="#"]');
        let lastY = window.scrollY;

        top.addEventListener('click', () =>
            window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));

        const update = () => {
            const y = window.scrollY;
            const max = document.documentElement.scrollHeight - innerHeight;
            const p = max > 0 ? y / max : 0;

            bar.style.transform = `scaleX(${p})`;
            top.style.setProperty('--p', (p * 100).toFixed(1));
            top.classList.toggle('is-on', y > innerHeight * .8);

            if (nav) {
                nav.classList.toggle('is-stuck', y > 40);
                nav.classList.toggle('is-hidden', y > lastY && y > 420 && !nav.matches(':hover'));
            }

            // Parallax do texto do hero
            if (heroInner && !REDUCED && y < innerHeight * 1.2) {
                heroInner.style.transform = `translate3d(0, ${y * 0.14}px, 0)`;
                heroInner.style.opacity = String(clamp(1 - y / (innerHeight * .85), 0, 1));
            }

            // Desenho da linha da timeline
            if (timeline) {
                const r = timeline.getBoundingClientRect();
                const prog = clamp((innerHeight * .78 - r.top) / r.height, 0, 1);
                timeline.style.setProperty('--tp', prog.toFixed(3));
            }

            // Link ativo
            let cur = '';
            sections.forEach(s => {
                if (s.getBoundingClientRect().top <= innerHeight * .35) cur = s.id;
            });
            navLinks.forEach(a =>
                a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur));

            lastY = y;
        };
        update();
        addEventListener('scroll', update, { passive: true });
        addEventListener('resize', update);
    }

    /* =========================================================
       9. NARRATIVA PINNED (seção Processo)
    ========================================================= */
    function processStory() {
        const track = $('.process-track');
        if (!track) return;
        const steps   = $$('.p-step', track);
        const visuals = $$('.p-visual', track);
        const barFill = $('.process-bar', track);
        if (!steps.length) return;

        const setActive = i => {
            steps.forEach((s, k)   => s.classList.toggle('is-on', k === i));
            visuals.forEach((v, k) => v.classList.toggle('is-on', k === i));
        };
        setActive(0);

        steps.forEach((s, i) => s.addEventListener('click', () => {
            const r = track.getBoundingClientRect();
            const startY = window.scrollY + r.top;
            const span = track.offsetHeight - innerHeight;
            window.scrollTo({
                top: startY + span * ((i + .5) / steps.length),
                behavior: REDUCED ? 'auto' : 'smooth'
            });
        }));

        if (REDUCED || matchMedia('(max-width: 860px)').matches) {
            steps.forEach(s => s.classList.add('is-on'));
            visuals.forEach(v => v.classList.add('is-on'));
            return;
        }

        const update = () => {
            const r = track.getBoundingClientRect();
            const span = track.offsetHeight - innerHeight;
            if (span <= 0) return;
            const p = clamp(-r.top / span, 0, 1);
            if (barFill) barFill.style.setProperty('--pp', p.toFixed(3));
            setActive(clamp(Math.floor(p * steps.length), 0, steps.length - 1));
        };
        update();
        addEventListener('scroll', update, { passive: true });
        addEventListener('resize', update);
    }

    /* =========================================================
       10. MARQUEE
    ========================================================= */
    function marquee() {
        const host = $('#stack-marquee');
        if (!host) return;
        const items = (host.dataset.items || '').split('|').filter(Boolean);
        const track = el('div', 'marquee-track');
        const build = () => items.forEach(t =>
            track.appendChild(el('span', null, `${t} <b>◆</b>`)));
        build(); build(); // duplicado para loop contínuo
        host.appendChild(track);
    }

    /* =========================================================
       11. SCROLL SUAVE COM EASING NOS ÂNCORAS
    ========================================================= */
    function smoothAnchors() {
        $$('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const id = a.getAttribute('href');
                if (!id || id === '#') return;
                const t = document.querySelector(id);
                if (!t) return;
                e.preventDefault();
                const y = window.scrollY + t.getBoundingClientRect().top - 84;
                window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
            });
        });
    }

    /* =========================================================
       12. PRELOADER
    ========================================================= */
    function preloader(done) {
        if (REDUCED) { done(); return; }
        const pre = el('div', 'preloader');
        const mark = 'GUSTAVO'.split('').map((c, i) =>
            `<span style="animation-delay:${i * .05}s">${c}</span>`).join('') +
            `<span class="accent" style="animation-delay:.4s">.</span>`;
        pre.innerHTML =
            `<div class="pre-inner">
                <div class="pre-mark">${mark}</div>
                <div class="pre-bar"><i></i></div>
                <div class="pre-count">CARREGANDO <b>0</b>%</div>
             </div>
             <div class="pre-curtain"><i></i><i></i><i></i><i></i><i></i></div>`;
        document.body.appendChild(pre);
        document.body.classList.add('is-loading');

        const fill = $('.pre-bar i', pre), num = $('.pre-count b', pre);
        let v = 0, loaded = false, finished = false;
        window.addEventListener('load', () => { loaded = true; });

        const finish = () => {
            if (finished) return;
            finished = true;
            pre.classList.add('is-done');
            document.body.classList.remove('is-loading');
            done();
            setTimeout(() => { pre.classList.add('is-gone'); }, 60);
            setTimeout(() => pre.remove(), 2200);
        };

        const step = () => {
            const ceil = loaded ? 100 : 88;
            v = Math.min(ceil, v + Math.max(.6, (ceil - v) * .06));
            fill.style.width = v + '%';
            num.textContent = Math.round(v);
            if (v >= 99.5) { finish(); return; }
            if (!finished) requestAnimationFrame(step);
        };
        setTimeout(step, 380);
        // Travas de segurança: nunca deixar o usuário preso na cortina
        setTimeout(() => { loaded = true; }, 4000);
        setTimeout(finish, 6500);
    }

    /* =========================================================
       13. ENTRADA DO HERO
    ========================================================= */
    function heroIntro() {
        const seq = [
            '.hero-badge', '.hero h1', '.hero-sub', '.hero-actions', '.hero-card'
        ];
        seq.forEach((sel, i) => {
            const n = $(sel);
            if (!n) return;
            n.classList.remove('is-in');
            n.style.setProperty('--d', (i * .11) + 's');
            if (sel !== '.hero h1') {
                n.setAttribute('data-reveal', sel === '.hero-card' ? 'scale' : 'up');
                // força reflow para a transição valer
                void n.offsetWidth;
            }
            requestAnimationFrame(() => n.classList.add('is-in'));
        });
    }

    /* =========================================================
       BOOT
    ========================================================= */
    function boot() {
        const spot = buildAmbience();
        particleNet($('.hero'));
        customCursor(spot);
        marquee();
        revealEngine();
        tiltCards();
        magnetic();
        scrollSystem();
        processStory();
        smoothAnchors();
        loop();
        preloader(() => setTimeout(heroIntro, 120));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
