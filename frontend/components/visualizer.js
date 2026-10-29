/**
 * @file visualizer.js
 * @brief Graphical rendering engine & step playback controller.
 */
(function (global) {
    'use strict';

    const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /** Renders an array stack as vertical slots, index 0 at the bottom. */
    function renderArrayStack(el, stack, highlight = {}) {
        const slots = [];
        for (let i = stack.capacity - 1; i >= 0; i--) {
            const filled = i <= stack.top;
            const cls = ['slot'];
            if (filled) cls.push('filled');
            if (i === stack.top) cls.push('is-top');
            if (highlight.index === i) cls.push(`hl-${highlight.kind || 'push'}`);
            if (highlight.visited && highlight.visited.includes(i)) cls.push('visited');
            slots.push(`<div class="${cls.join(' ')}" style="--i:${i}">
                <span class="slot-idx">[${i}]</span>
                <span class="slot-val">${filled ? esc(stack.arr[i]) : ''}</span>
                ${i === stack.top ? '<span class="pointer">← top</span>' : ''}
            </div>`);
        }
        el.innerHTML = slots.join('') + (stack.top === -1 ? '<div class="empty-note">top = -1</div>' : '');
    }

    /** Renders linked-list nodes top to bottom with simulated addresses. */
    function renderLinkedStack(el, stack, highlight = {}) {
        if (stack.isEmpty()) {
            el.innerHTML = `<div class="ll-head">top → <span class="null">nullptr</span></div>`;
            return;
        }
        const parts = [`<div class="ll-head">top → <code>${esc(stack.nodes[0].address)}</code></div>`];
        stack.nodes.forEach((n, i) => {
            const cls = ['node'];
            if (i === 0) cls.push('is-top');
            if (highlight.index === i) cls.push(`hl-${highlight.kind || 'push'}`);
            if (highlight.visited && highlight.visited.includes(i)) cls.push('visited');
            const next = stack.nodes[i + 1] ? stack.nodes[i + 1].address : 'nullptr';
            parts.push(`<div class="${cls.join(' ')}">
                <div class="node-addr">${esc(n.address)}</div>
                <div class="node-body"><span class="node-data">${esc(n.data)}</span><span class="node-next">next: ${esc(next)}</span></div>
            </div>`);
            parts.push(`<div class="arrow" aria-hidden="true">↓</div>`);
        });
        parts.push('<div class="ll-null">nullptr</div>');
        el.innerHTML = parts.join('');
    }

    /** Renders a small horizontal stack (bottom on the left). */
    function miniStack(items, label = 'Stack') {
        const cells = items.length
            ? items.map((v, i) => `<span class="mini-cell${i === items.length - 1 ? ' top' : ''}">${esc(v)}</span>`).join('')
            : '<span class="mini-empty">empty</span>';
        return `<div class="mini"><div class="mini-label">${esc(label)} <small>(bottom → top)</small></div><div class="mini-cells">${cells}</div></div>`;
    }

    /**
     * Step playback controller. `renderStep(step, index, steps)` returns HTML
     * for the stage area.
     */
    class StepPlayer {
        constructor(container, renderStep) {
            this.container = container;
            this.renderStep = renderStep;
            this.steps = [];
            this.index = 0;
            this.timer = null;
            container.innerHTML = `
                <div class="panel player-panel">
                    <div class="player-bar">
                        <button class="btn ghost small" data-act="first" aria-label="First step">⏮</button>
                        <button class="btn ghost small" data-act="prev" aria-label="Previous step">◀</button>
                        <button class="btn primary small" data-act="play">▶ Play</button>
                        <button class="btn ghost small" data-act="next" aria-label="Next step">▶</button>
                        <button class="btn ghost small" data-act="last" aria-label="Last step">⏭</button>
                        <label class="speed">Speed <input type="range" min="150" max="1500" step="50" value="700" data-act="speed"></label>
                        <span class="step-count"></span>
                    </div>
                    <div class="progress"><div class="progress-fill"></div></div>
                    <div class="player-stage"></div>
                    <div class="player-msg"></div>
                    <div class="player-result"></div>
                </div>`;
            this.stage = container.querySelector('.player-stage');
            this.msg = container.querySelector('.player-msg');
            this.resultEl = container.querySelector('.player-result');
            this.countEl = container.querySelector('.step-count');
            this.fill = container.querySelector('.progress-fill');
            this.playBtn = container.querySelector('[data-act="play"]');
            this.speedInput = container.querySelector('[data-act="speed"]');
            container.addEventListener('click', e => {
                const act = e.target.closest('[data-act]')?.dataset.act;
                if (!act || act === 'speed') return;
                if (act === 'play') return this.toggle();
                this.pause();
                if (act === 'first') this.go(0);
                if (act === 'prev') this.go(this.index - 1);
                if (act === 'next') this.go(this.index + 1);
                if (act === 'last') this.go(this.steps.length - 1);
            });
            this.speedInput.addEventListener('input', () => { if (this.timer) { this.pause(); this.play(); } });
            container.hidden = true;
        }

        load(steps, result) {
            this.pause();
            this.steps = steps;
            this.container.hidden = false;
            this.resultEl.className = `player-result ${result.ok ? 'ok' : 'bad'}`;
            this.resultEl.innerHTML = result.html;
            this.resultEl.hidden = true;
            this.go(0);
            this.play();
        }

        go(i) {
            if (!this.steps.length) return;
            this.index = Math.max(0, Math.min(i, this.steps.length - 1));
            const step = this.steps[this.index];
            this.stage.innerHTML = this.renderStep(step, this.index, this.steps);
            this.msg.className = `player-msg act-${step.action}`;
            this.msg.textContent = step.message;
            this.countEl.textContent = `Step ${this.index + 1} / ${this.steps.length}`;
            this.fill.style.width = `${((this.index + 1) / this.steps.length) * 100}%`;
            this.resultEl.hidden = this.index !== this.steps.length - 1;
        }

        play() {
            if (this.index >= this.steps.length - 1) this.go(0);
            this.playBtn.textContent = '❚❚ Pause';
            const delay = 1650 - Number(this.speedInput.value);
            this.timer = setInterval(() => {
                if (this.index >= this.steps.length - 1) return this.pause();
                this.go(this.index + 1);
            }, delay);
        }

        pause() {
            clearInterval(this.timer);
            this.timer = null;
            this.playBtn.textContent = '▶ Play';
        }

        toggle() { this.timer ? this.pause() : this.play(); }
    }

    global.Visualizer = { renderArrayStack, renderLinkedStack, miniStack, StepPlayer, esc };
})(window);
