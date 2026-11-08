(function () {
    var page = document.querySelector('.ds-page');
    if (!page) return;

    function press(group, active) {
        group.querySelectorAll('button').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === active));
        });
    }

    // Hero tab band
    var band = page.querySelector('[data-tabband]');
    if (band) {
        var ns = 'http://www.w3.org/2000/svg';
        var riff = [[6, 0], [6, 3], [6, 5], [5, 3], [5, 5], [4, 2], [4, 5], [3, 2], [3, 4], [2, 3], [2, 5], [1, 3],
        [1, 5], [1, 7], [2, 8], [2, 5], [3, 7], [3, 4], [4, 7], [4, 5], [5, 7], [5, 5], [6, 7], [6, 5]];
        for (var s = 0; s < 6; s++) {
            var ln = document.createElementNS(ns, 'line');
            ln.setAttribute('x1', 0); ln.setAttribute('x2', 1600);
            ln.setAttribute('y1', 26 + s * 16); ln.setAttribute('y2', 26 + s * 16);
            band.appendChild(ln);
        }
        riff.concat(riff.slice(0, 8)).forEach(function (n, i) {
            var t = document.createElementNS(ns, 'text');
            t.setAttribute('x', 40 + i * 50);
            t.setAttribute('y', 26 + (n[0] - 1) * 16);
            if (i % 8 === 0) t.setAttribute('class', 'is-hot');
            t.textContent = n[1];
            band.appendChild(t);
        });
    }

    // Track views. Notation or tab always stays on.
    var score = page.querySelector('.ds-score[data-score], .ds-score');
    var viewSeg = score && score.querySelector('[data-views], .ds-seg');
    if (viewSeg) {
        var svg = score.querySelector(':scope > svg') || score.querySelector('svg');
        var head = svg.querySelector('.playhead');
        var rows = ['notation', 'tab'];
        var layout = function () {
            var y = 0;
            var activeCount = 0;
            rows.forEach(function (name) {
                var btn = viewSeg.querySelector('[data-view-btn="' + name + '"]');
                if (btn && btn.getAttribute('aria-pressed') === 'true') activeCount++;
            });
            rows.forEach(function (name) {
                var g = svg.querySelector('[data-row="' + name + '"]');
                var btn = viewSeg.querySelector('[data-view-btn="' + name + '"]');
                var on = btn.getAttribute('aria-pressed') === 'true';
                if (on && activeCount === 1) {
                    btn.setAttribute('title', 'Notation or tab always stays on');
                } else {
                    btn.removeAttribute('title');
                }
                if (on) g.removeAttribute('hidden'); else g.setAttribute('hidden', '');
                if (on) {
                    g.setAttribute('transform', 'translate(0 ' + (y - Number(g.dataset.top)) + ')');
                    y += Number(g.dataset.h) + 4;
                }
            });
            svg.setAttribute('viewBox', '0 0 640 ' + (y + 28));
            head.setAttribute('height', y + 16);
        };
        viewSeg.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-view-btn]');
            if (!btn) return;
            var on = btn.getAttribute('aria-pressed') === 'true';
            var other = btn.dataset.viewBtn === 'notation' ? 'tab' : 'notation';
            var otherOn = viewSeg.querySelector('[data-view-btn="' + other + '"]').getAttribute('aria-pressed') === 'true';
            if (on && (btn.dataset.viewBtn === 'notation' || btn.dataset.viewBtn === 'tab') && !otherOn) return;
            btn.setAttribute('aria-pressed', String(!on));
            layout();
        });
        layout();
    }

    // Drum roll, drawn once
    var roll = page.querySelector('[data-roll]');
    if (roll) {
        var ROWS = [
            { name: 'Crash', hits: [0] },
            { name: 'Ride', hits: [] },
            { name: 'Hi-hat', hits: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5] },
            { name: 'Snare', hits: [1, 3] },
            { name: 'Kick', hits: [0, 1.5, 2, 2.5] }
        ];
        var COLS = 16, PER = COLS / 4;
        var on = function (r, c) { return r.hits.some(function (beat) { return beat * PER === c; }); };
        var grid = '';
        ROWS.forEach(function (r) {
            grid += '<div class="ds-roll__row" style="--cols:' + COLS + '"><span class="ds-roll__label">' + r.name + '</span>';
            for (var c = 0; c < COLS; c++) {
                grid += '<span class="ds-roll__cell' + (c % PER === 0 ? ' is-beat' : '') + (on(r, c) ? ' is-on' : '') + '"></span>';
            }
            grid += '</div>';
        });
        roll.querySelector('[data-roll-grid]').innerHTML = grid;
        var velEl = roll.querySelector('[data-roll-vel]');
        velEl.style.setProperty('--cols', COLS);
        var vel = '<span class="ds-roll__label">Velocity</span>';
        for (var c = 0; c < COLS; c++) {
            var hit = ROWS.some(function (r) { return on(r, c); });
            vel += hit ? '<span style="height:' + (c % PER === 0 ? 95 : 55 + (c * 7) % 25) + '%"></span>' : '<i></i>';
        }
        velEl.innerHTML = vel;
    }

    // Chord builder with playable positions (standard tuning)
    var cb = page.querySelector('[data-chords]');
    if (cb) {
        var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        var TYPES = {
            maj: { label: '', iv: [0, 4, 7] }, m: { label: 'm', iv: [0, 3, 7] },
            '7': { label: '7', iv: [0, 4, 7, 10] }, m7: { label: 'm7', iv: [0, 3, 7, 10] },
            maj7: { label: 'maj7', iv: [0, 4, 7, 11] }
        };
        var OPEN = [4, 9, 2, 7, 11, 4]; // low E to high e
        var WINDOWS = [0, 3, 5, 8];
        var pick = { root: 'A', type: 'm7' };
        var symbol = cb.querySelector('[data-chord-symbol]');
        var posEl = cb.querySelector('[data-chord-pos]');

        var voicings = function (root, iv) {
            var tones = iv.map(function (i) { return (root + i) % 12; });
            var out = [], seen = {};
            WINDOWS.forEach(function (lo) {
                var hi = lo + 4, best = null;
                var opts = OPEN.map(function (open) {
                    var o = [-1];
                    for (var f = lo; f <= hi; f++) if (tones.indexOf((open + f) % 12) >= 0) o.push(f);
                    return o;
                });
                var walk = function (s, cur) {
                    if (s === 6) {
                        var played = cur.filter(function (f) { return f >= 0; });
                        if (played.length < 4) return;
                        var first = cur.findIndex(function (f) { return f >= 0; });
                        var last = cur.length - 1 - cur.slice().reverse().findIndex(function (f) { return f >= 0; });
                        if (cur.slice(first, last + 1).some(function (f) { return f < 0; })) return;
                        var covered = {};
                        cur.forEach(function (f, i) { if (f >= 0) covered[(OPEN[i] + f) % 12] = 1; });
                        var n = Object.keys(covered).length;
                        if (n < iv.length) return;
                        var fretted = played.filter(function (f) { return f > 0; });
                        var span = fretted.length ? Math.max.apply(null, fretted) - Math.min.apply(null, fretted) : 0;
                        if (span > 3) return;
                        if (lo > 0 && fretted.length && Math.min.apply(null, fretted) !== lo && Math.min.apply(null, fretted) > lo + 1) return;
                        var rootBass = (OPEN[first] + cur[first]) % 12 === root ? 6 : 0;
                        var score = played.length * 3 + rootBass - span * 2 - (cur.indexOf(0) >= 0 && lo > 0 ? 9 : 0);
                        if (!best || score > best.score) best = { frets: cur.slice(), score: score };
                        return;
                    }
                    opts[s].forEach(function (f) { cur.push(f); walk(s + 1, cur); cur.pop(); });
                };
                walk(0, []);
                if (best) {
                    var key = best.frets.join(',');
                    if (!seen[key]) { seen[key] = 1; out.push(best.frets); }
                }
            });
            return out;
        };

        var diagram = function (frets) {
            var fretted = frets.filter(function (f) { return f > 0; });
            var base = fretted.length && Math.max.apply(null, fretted) > 4 ? Math.min.apply(null, fretted) : 1;
            var x = function (i) { return 14 + i * 14; };
            var svg = '<svg viewBox="0 0 98 108" role="img" aria-label="Chord position">';
            for (var f = 0; f <= 5; f++) svg += '<line x1="14" x2="84" y1="' + (24 + f * 16) + '" y2="' + (24 + f * 16) +
                '" stroke="' + (f === 0 && base === 1 ? '#E4E6EE' : '#5A5F70') + '" stroke-width="' + (f === 0 && base === 1 ? 3 : 1) + '"/>';
            for (var i = 0; i < 6; i++) svg += '<line x1="' + x(i) + '" x2="' + x(i) + '" y1="24" y2="104" stroke="#8E92A0" stroke-width="1"/>';
            frets.forEach(function (f, i) {
                if (f < 0) svg += '<text x="' + x(i) + '" y="16" text-anchor="middle" font-size="10" fill="#8E92A0">×</text>';
                else if (f === 0) svg += '<circle cx="' + x(i) + '" cy="12" r="3.2" fill="none" stroke="#8E92A0"/>';
                else svg += '<circle cx="' + x(i) + '" cy="' + (24 + (f - base) * 16 + 8) + '" r="5.5" fill="#FF8A3D"/>';
            });
            if (base > 1) svg += '<text x="94" y="' + 40 + '" font-size="10" fill="#C4C6D0" text-anchor="end">' + base + 'fr</text>';
            return svg + '</svg>';
        };

        var draw = function () {
            var t = TYPES[pick.type];
            var name = pick.root + t.label;
            symbol.textContent = name;
            cb.querySelectorAll('[data-chord-group]').forEach(function (g) {
                g.querySelectorAll('button').forEach(function (b) {
                    b.setAttribute('aria-pressed', String(pick[g.dataset.chordGroup] === b.dataset.v));
                });
            });
            var list = voicings(PC[pick.root], t.iv);
            posEl.innerHTML = list.map(function (v, i) {
                return '<figure><figcaption>Position ' + (i + 1) + '</figcaption>' + diagram(v) + '</figure>';
            }).join('');
        };
        var OPTS = { root: Object.keys(PC), type: Object.keys(TYPES) };
        cb.querySelectorAll('[data-chord-group]').forEach(function (g) {
            var box = g.querySelector('div');
            OPTS[g.dataset.chordGroup].forEach(function (v) {
                var b = document.createElement('button');
                b.type = 'button';
                b.dataset.v = v;
                b.textContent = g.dataset.chordGroup === 'type' ? (TYPES[v].label || 'maj') : v;
                box.appendChild(b);
            });
            box.addEventListener('click', function (e) {
                var b = e.target.closest('button');
                if (!b) return;
                pick[g.dataset.chordGroup] = b.dataset.v;
                draw();
            });
        });
        draw();
    }

    // Retuning demo: Eb standard -> E standard raises every string a semitone
    var retune = page.querySelector('[data-retune]');
    if (retune) {
        var NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        var FROM = { labels: ['eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb'], open: [3, 10, 6, 1, 8, 3] };
        var TO = { labels: ['e', 'B', 'G', 'D', 'A', 'E'], open: [4, 11, 7, 2, 9, 4] };
        var RIFF = [[6, 0], [6, 3], [6, 5], [5, 3], [5, 5], [6, 5], [6, 3], [6, 0]];

        function render(target, tuning, notes) {
            var tab = retune.querySelector('[data-tab="' + target + '"]');
            var pitch = retune.querySelector('[data-pitch="' + target + '"]');
            var html = '';
            for (var s = 1; s <= 6; s++) {
                html += '<span class="s">' + tuning.labels[s - 1] + '</span>';
                notes.forEach(function (n) {
                    var cell = '';
                    if (n.string === s) {
                        var cls = n.flag ? 'is-flag' : (n.changed ? 'is-changed' : '');
                        cell = '<b class="' + cls + '">' + (n.flag ? '✕' : n.fret) + '</b>';
                    }
                    html += '<span class="c">' + cell + '</span>';
                });
            }
            tab.innerHTML = html;
            pitch.innerHTML = '<span>♪</span>' + notes.map(function (n) {
                return '<span>' + (n.flag ? '–' : NAMES[(tuning.open[n.string - 1] + n.fret) % 12]) + '</span>';
            }).join('');
        }

        function apply(mode) {
            var before = RIFF.map(function (n) { return { string: n[0], fret: n[1] }; });
            var after = before.map(function (n) {
                if (mode === 'frets') return { string: n.string, fret: n.fret };
                var f = n.fret - 1;
                return { string: n.string, fret: f, changed: true, flag: f < 0 };
            });
            render('before', FROM, before);
            render('after', TO, after);
            var flagged = after.filter(function (n) { return n.flag; }).length;
            retune.querySelector('[data-retune-summary]').innerHTML = mode === 'frets'
                ? '<strong>Same shapes, same frets.</strong> The riff now sounds a semitone higher.'
                : '<strong>Same pitches, new frets.</strong> ' + flagged +
                ' notes fall below the lowest open string and are flagged.';
        }

        var modeSeg = retune.querySelector('.ds-seg');
        modeSeg.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-mode]');
            if (!btn) return;
            press(modeSeg, btn);
            apply(btn.dataset.mode);
        });
        apply('sound');
    }
})();
