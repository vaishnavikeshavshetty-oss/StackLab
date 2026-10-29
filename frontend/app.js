/**
 * @file app.js
 * @brief Main application controller, routing & state sync.
 */
(function () {
    'use strict';

    const E = window.StackEngine;
    const V = window.Visualizer;
    const H = window.StackHistory;
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));

    /* ---------- Routing ---------- */
    const VIEWS = ['dashboard', 'array', 'linked', 'brackets', 'convert', 'evaluate', 'history'];

    function show(view) {
        if (!VIEWS.includes(view)) view = 'dashboard';
        $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
        $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
        if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
        window.scrollTo(0, 0);
    }
    $$('.nav-item').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
    $$('[data-goto]').forEach(b => b.addEventListener('click', () => show(b.dataset.goto)));
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));

    /* ---------- Toast ---------- */
    let toastTimer;
    function toast(text, kind = 'info') {
        const t = $('#toast');
        t.textContent = text;
        t.className = `toast show ${kind}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (t.className = 'toast'), 2600);
    }

    function setMessage(el, res) {
        el.className = `message ${res.ok ? 'ok' : res.type === 'notfound' ? 'warn' : 'bad'}`;
        el.textContent = res.message;
    }

    /* ---------- Module 01: Array Stack ---------- */
    const arrStack = new E.ArrayStack(6, false);
    const arrVisual = $('#arr-visual');

    function renderArr(highlight) {
        V.renderArrayStack(arrVisual, arrStack, highlight);
        $('#arr-stats').innerHTML = stats([
            ['Size', arrStack.size()], ['Capacity', arrStack.capacity], ['top', arrStack.top],
            ['Mode', arrStack.dynamic ? 'Dynamic' : 'Fixed']
        ]);
    }

    function stats(pairs) {
        return pairs.map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${V.esc(v)}</strong></div>`).join('');
    }

    $$('[data-arr]').forEach(btn => btn.addEventListener('click', () => {
        const op = btn.dataset.arr;
        const input = $('#arr-value');
        const value = input.value.trim();
        const before = arrStack.snapshot();
        let res, label, hl = {};

        if ((op === 'push' || op === 'search') && !value) {
            toast('Enter a value first.', 'warn');
            input.focus();
            return;
        }
        switch (op) {
            case 'push': res = arrStack.push(value); label = `push(${value})`; hl = { index: res.index, kind: 'push' }; break;
            case 'pop': {
                const idx = arrStack.top;
                res = arrStack.pop(); label = `pop() → ${res.value}`;
                hl = { index: idx, kind: 'pop' };
                break;
            }
            case 'peek': res = arrStack.peek(); hl = { index: res.index, kind: 'peek' }; break;
            case 'search': res = arrStack.search(value); hl = { index: res.ok ? res.index : undefined, kind: 'found', visited: res.visited }; break;
            case 'reverse': res = arrStack.reverse(); label = 'reverse()'; break;
            case 'clear': res = arrStack.clear(); label = 'clear()'; break;
            case 'resize': {
                const cap = parseInt($('#arr-capacity').value, 10);
                if (!(cap >= 1 && cap <= 16)) { toast('Capacity must be between 1 and 16.', 'warn'); return; }
                arrStack.dynamic = $('#arr-dynamic').checked;
                res = arrStack.resize(cap);
                label = `resize(${cap}, ${arrStack.dynamic ? 'dynamic' : 'fixed'})`;
                if (res.ok && before.dynamic !== arrStack.dynamic) res.message += ` Mode: ${arrStack.dynamic ? 'dynamic' : 'fixed'}.`;
                break;
            }
        }
        setMessage($('#arr-message'), res);
        $('#arr-code').textContent = res.code || '';
        if (res.ok && label) {
            H.record('array', label, before, arrStack.snapshot());
            $('#arr-capacity').value = arrStack.capacity;
        } else if (!res.ok) {
            H.audit('array', res.message, 'error');
            if (res.type === 'overflow' || res.type === 'underflow') shake(arrVisual);
        }
        if (op === 'push' && res.ok) { input.value = ''; input.focus(); }
        renderArr(hl);
    }));
    $('#arr-value').addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-arr="push"]').click(); });

    /* ---------- Module 02: Linked-List Stack ---------- */
    const llStack = new E.LinkedListStack();
    const llVisual = $('#ll-visual');

    function renderLL(highlight) {
        V.renderLinkedStack(llVisual, llStack, highlight);
        $('#ll-stats').innerHTML = stats([
            ['Size', llStack.size()],
            ['Heap bytes', llStack.size() * 16],
            ['top', llStack.isEmpty() ? 'nullptr' : llStack.nodes[0].address]
        ]);
    }

    $$('[data-ll]').forEach(btn => btn.addEventListener('click', () => {
        const op = btn.dataset.ll;
        const input = $('#ll-value');
        const value = input.value.trim();
        const before = llStack.snapshot();
        let res, label, hl = {};

        if ((op === 'push' || op === 'search') && !value) {
            toast('Enter a value first.', 'warn');
            input.focus();
            return;
        }
        switch (op) {
            case 'push': res = llStack.push(value); label = `push(${value})`; hl = { index: 0, kind: 'push' }; break;
            case 'pop': res = llStack.pop(); label = `pop() → ${res.value}`; break;
            case 'peek': res = llStack.peek(); hl = { index: 0, kind: 'peek' }; break;
            case 'search': res = llStack.search(value); hl = { index: res.ok ? res.index : undefined, kind: 'found', visited: res.visited }; break;
            case 'reverse': res = llStack.reverse(); label = 'reverse()'; break;
            case 'clear': res = llStack.clear(); label = 'clear()'; break;
        }
        setMessage($('#ll-message'), res);
        $('#ll-code').textContent = res.code || '';
        if (res.ok && label) H.record('linked', label, before, llStack.snapshot());
        else if (!res.ok) {
            H.audit('linked', res.message, 'error');
            if (res.type === 'underflow') shake(llVisual);
        }
        if (op === 'push' && res.ok) { input.value = ''; input.focus(); }
        renderLL(hl);
    }));
    $('#ll-value').addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-ll="push"]').click(); });

    function shake(el) {
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    }

    /* ---------- Undo / Redo ---------- */
    const stores = {
        array: { stack: arrStack, render: renderArr, msg: '#arr-message', after: () => ($('#arr-capacity').value = arrStack.capacity, $('#arr-dynamic').checked = arrStack.dynamic) },
        linked: { stack: llStack, render: renderLL, msg: '#ll-message', after: () => {} }
    };

    function doUndoRedo(target, kind) {
        const snap = kind === 'undo' ? H.undo(target) : H.redo(target);
        const s = stores[target];
        if (!snap) { toast(`Nothing to ${kind}.`, 'warn'); return; }
        s.stack.restore(snap);
        s.after();
        s.render();
        const el = $(s.msg);
        el.className = 'message';
        el.textContent = `${kind === 'undo' ? 'Undid' : 'Redid'} last operation.`;
    }

    $$('[data-undo]').forEach(b => b.addEventListener('click', () => doUndoRedo(b.dataset.undo, 'undo')));
    $$('[data-redo]').forEach(b => b.addEventListener('click', () => doUndoRedo(b.dataset.redo, 'redo')));
    $('#hist-undo').addEventListener('click', () => doUndoRedo($('#hist-target').value, 'undo'));
    $('#hist-redo').addEventListener('click', () => doUndoRedo($('#hist-target').value, 'redo'));
    $('#hist-target').addEventListener('change', renderHistory);
    $('#log-clear').addEventListener('click', () => H.clearLog());

    document.addEventListener('keydown', e => {
        if (!(e.ctrlKey || e.metaKey) || e.target.matches('input, select')) return;
        const view = location.hash.slice(1);
        if (!stores[view]) return;
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); doUndoRedo(view, 'undo'); }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); doUndoRedo(view, 'redo'); }
    });

    function renderHistory() {
        const { undo, redo } = H.stacks($('#hist-target').value);
        const list = arr => arr.length
            ? arr.slice().reverse().map((e, i) => `<li class="${i === 0 ? 'top' : ''}"><span>${V.esc(e.label)}</span><time>${e.time.toLocaleTimeString()}</time></li>`).join('')
            : '<li class="empty">empty</li>';
        $('#undo-list').innerHTML = list(undo);
        $('#redo-list').innerHTML = list(redo);
        $('#undo-count').textContent = undo.length;
        $('#redo-count').textContent = redo.length;
        const names = { array: 'Array', linked: 'Linked List' };
        $('#audit-log').innerHTML = H.log.length
            ? H.log.map(l => `<li class="log-${l.kind}"><time>${l.time.toLocaleTimeString()}</time><span class="tag">${names[l.target]}</span>${V.esc(l.label)}</li>`).join('')
            : '<li class="empty">No operations yet. Push something onto a stack.</li>';
    }
    H.onChange(renderHistory);

    /* ---------- Module 03: Brackets ---------- */
    const brPlayer = new V.StepPlayer($('[data-player="brackets"]'), (step, i, steps) => {
        const expr = steps.expr;
        const chars = expr.split('').map((c, idx) => {
            const cls = ['ch'];
            if (idx === step.index) cls.push(step.action === 'error' ? 'cur-err' : 'cur');
            else if (idx < step.index) cls.push('done');
            if ('()[]{}'.includes(c)) cls.push('br');
            return `<span class="${cls.join(' ')}">${c === ' ' ? '&nbsp;' : V.esc(c)}</span>`;
        }).join('');
        return `<div class="tape">${chars}</div>${V.miniStack(step.stack, 'Bracket stack')}`;
    });

    function runBrackets() {
        const expr = $('#br-input').value;
        if (!expr.trim()) { toast('Enter an expression.', 'warn'); return; }
        const res = E.checkParentheses(expr);
        res.steps.expr = expr;
        brPlayer.load(res.steps, { ok: res.balanced, html: `<strong>${res.balanced ? '✓' : '✗'}</strong> ${V.esc(res.message)}` });
    }
    $('#br-run').addEventListener('click', runBrackets);
    $('#br-input').addEventListener('keydown', e => { if (e.key === 'Enter') runBrackets(); });
    $$('[data-br]').forEach(c => c.addEventListener('click', () => { $('#br-input').value = c.dataset.br; runBrackets(); }));

    /* ---------- Module 04: Conversion ---------- */
    const cvPlayer = new V.StepPlayer($('[data-player="convert"]'), step => {
        $$('#prec-table tr[data-op]').forEach(r => r.classList.toggle('hl', r.dataset.op.includes(step.token)));
        return `<div class="token-now">Token <code>${V.esc(step.token)}</code></div>
            ${V.miniStack(step.stack, 'Operator stack')}
            <div class="mini"><div class="mini-label">Output</div><div class="output-line">${step.output.map(V.esc).join(' ') || '<span class="mini-empty">empty</span>'}</div></div>`;
    });

    function runConvert() {
        const expr = $('#cv-input').value;
        const mode = $('#cv-mode').value;
        try {
            const res = mode === 'prefix' ? E.infixToPrefix(expr) : E.infixToPostfix(expr);
            cvPlayer.load(res.steps, { ok: true, html: `${mode === 'prefix' ? 'Prefix' : 'Postfix'}: <code>${V.esc(res.result)}</code>` });
        } catch (e) {
            cvPlayer.load([{ token: '!', action: 'error', stack: [], output: [], message: e.message }], { ok: false, html: `✗ ${V.esc(e.message)}` });
        }
    }
    $('#cv-run').addEventListener('click', runConvert);
    $('#cv-input').addEventListener('keydown', e => { if (e.key === 'Enter') runConvert(); });
    $$('[data-cv]').forEach(c => c.addEventListener('click', () => { $('#cv-input').value = c.dataset.cv; runConvert(); }));

    /* ---------- Module 05: Evaluation ---------- */
    const evPlayer = new V.StepPlayer($('[data-player="evaluate"]'), step =>
        `<div class="token-now">Token <code>${V.esc(step.token)}</code></div>${V.miniStack(step.stack, 'Operand stack')}`);

    function runEvaluate() {
        const expr = $('#ev-input').value;
        const mode = $('#ev-mode').value;
        try {
            const res = E.evaluate(expr, mode);
            evPlayer.load(res.steps, res.ok
                ? { ok: true, html: `Result: <code>${V.esc(res.value)}</code>` }
                : { ok: false, html: `✗ ${V.esc(res.error)}` });
        } catch (e) {
            evPlayer.load([{ token: '!', action: 'error', stack: [], message: e.message }], { ok: false, html: `✗ ${V.esc(e.message)}` });
        }
    }
    $('#ev-run').addEventListener('click', runEvaluate);
    $('#ev-input').addEventListener('keydown', e => { if (e.key === 'Enter') runEvaluate(); });
    $$('[data-ev]').forEach(c => c.addEventListener('click', () => {
        const [mode, expr] = c.dataset.ev.split('|');
        $('#ev-mode').value = mode;
        $('#ev-input').value = expr;
        runEvaluate();
    }));

    /* ---------- Boot ---------- */
    const wasm = E.mode() === 'wasm';
    $('#engine-dot').classList.add(wasm ? 'wasm' : 'core');
    $('#engine-label').textContent = wasm ? 'WebAssembly engine' : 'C++ Algorithmic Core (JS)';

    renderArr();
    renderLL();
    renderHistory();
    show(location.hash.slice(1) || 'dashboard');
})();
