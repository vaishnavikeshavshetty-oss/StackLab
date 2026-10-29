/**
 * @file history.js
 * @brief Dual-stack Undo/Redo & operation audit logging.
 */
(function (global) {
    'use strict';

    class History {
        constructor() {
            this.targets = {};
            this.log = [];
            this.listeners = [];
        }

        _t(target) {
            if (!this.targets[target]) this.targets[target] = { undo: [], redo: [] };
            return this.targets[target];
        }

        onChange(fn) { this.listeners.push(fn); }
        _emit() { this.listeners.forEach(fn => fn()); }

        /** Records a mutation. Any new operation invalidates the redo stack. */
        record(target, label, before, after) {
            const t = this._t(target);
            t.undo.push({ label, before, after, time: new Date() });
            t.redo.length = 0;
            this.audit(target, label, 'op');
        }

        undo(target) {
            const t = this._t(target);
            if (!t.undo.length) return null;
            const entry = t.undo.pop();
            t.redo.push(entry);
            this.audit(target, `Undo: ${entry.label}`, 'undo');
            return entry.before;
        }

        redo(target) {
            const t = this._t(target);
            if (!t.redo.length) return null;
            const entry = t.redo.pop();
            t.undo.push(entry);
            this.audit(target, `Redo: ${entry.label}`, 'redo');
            return entry.after;
        }

        audit(target, label, kind) {
            this.log.unshift({ target, label, kind, time: new Date() });
            if (this.log.length > 200) this.log.pop();
            this._emit();
        }

        clearLog() { this.log = []; this._emit(); }

        stacks(target) { return this._t(target); }
    }

    global.StackHistory = new History();
})(window);
