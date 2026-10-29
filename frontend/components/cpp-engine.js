/**
 * @file cpp-engine.js
 * @brief C++ Algorithmic Core adapter.
 *
 * Mirrors the behaviour of the C++ classes in cpp/ (ArrayStack, LinkedListStack,
 * ParenthesesChecker, ExpressionConverter, ExpressionEvaluator). If an Emscripten
 * build (stacklab.js / stacklab.wasm) has been loaded and exposes `Module`, the
 * engine reports WebAssembly mode; otherwise this JavaScript core is used.
 */
(function (global) {
    'use strict';

    /* ---------------- ArrayStack ---------------- */
    class ArrayStack {
        constructor(capacity = 6, dynamic = false) {
            this.capacity = capacity;
            this.dynamic = dynamic;
            this.arr = new Array(capacity).fill(null);
            this.top = -1;
        }
        size() { return this.top + 1; }
        isEmpty() { return this.top === -1; }
        isFull() { return this.top === this.capacity - 1; }

        push(value) {
            if (this.isFull()) {
                if (!this.dynamic) {
                    return { ok: false, type: 'overflow', message: `Stack Overflow: capacity ${this.capacity} reached.`,
                        code: `if (top == capacity - 1) {\n    throw overflow_error("Stack Overflow");\n}` };
                }
                const old = this.capacity;
                this.resize(old * 2);
                this.top++;
                this.arr[this.top] = value;
                return { ok: true, index: this.top, message: `Array was full: resized ${old} → ${this.capacity}, then pushed ${value} at arr[${this.top}].`,
                    code: `int* bigger = new int[capacity * 2];\ncopy(arr, arr + capacity, bigger);\ndelete[] arr; arr = bigger;\narr[++top] = ${value};` };
            }
            this.top++;
            this.arr[this.top] = value;
            return { ok: true, index: this.top, message: `Pushed ${value}. top = ${this.top}.`, code: `arr[++top] = ${value};   // top = ${this.top}` };
        }

        pop() {
            if (this.isEmpty()) {
                return { ok: false, type: 'underflow', message: 'Stack Underflow: nothing to pop.', code: `if (top == -1) {\n    throw underflow_error("Stack Underflow");\n}` };
            }
            const value = this.arr[this.top];
            this.arr[this.top] = null;
            this.top--;
            return { ok: true, value, index: this.top + 1, message: `Popped ${value}. top = ${this.top}.`, code: `return arr[top--];   // returns ${value}` };
        }

        peek() {
            if (this.isEmpty()) return { ok: false, type: 'underflow', message: 'Stack is empty: nothing to peek.', code: `if (top == -1) throw underflow_error("Empty");` };
            return { ok: true, value: this.arr[this.top], index: this.top, message: `Top element is ${this.arr[this.top]} (arr[${this.top}]).`, code: `return arr[top];   // ${this.arr[this.top]}` };
        }

        search(value) {
            const visited = [];
            for (let i = this.top; i >= 0; i--) {
                visited.push(i);
                if (String(this.arr[i]) === String(value)) {
                    return { ok: true, index: i, visited, position: this.top - i + 1,
                        message: `Found ${value} at arr[${i}] (position ${this.top - i + 1} from top) after ${visited.length} comparison(s).`,
                        code: `for (int i = top; i >= 0; --i)\n    if (arr[i] == ${value}) return top - i + 1;` };
                }
            }
            return { ok: false, type: 'notfound', visited, message: `${value} not found after ${visited.length} comparison(s).`,
                code: `for (int i = top; i >= 0; --i) ...\nreturn -1;   // not found` };
        }

        reverse() {
            let l = 0, r = this.top;
            while (l < r) { [this.arr[l], this.arr[r]] = [this.arr[r], this.arr[l]]; l++; r--; }
            return { ok: true, message: `Reversed ${this.size()} element(s) in place.`, code: `for (int l = 0, r = top; l < r; ++l, --r)\n    swap(arr[l], arr[r]);` };
        }

        clear() {
            const n = this.size();
            this.arr.fill(null);
            this.top = -1;
            return { ok: true, message: `Cleared ${n} element(s) in O(1): top = -1.`, code: `top = -1;   // O(1), slots become garbage` };
        }

        resize(newCap) {
            if (newCap < this.size()) {
                return { ok: false, type: 'invalid', message: `Cannot shrink to ${newCap}: stack holds ${this.size()} element(s).`, code: '' };
            }
            const next = new Array(newCap).fill(null);
            for (let i = 0; i <= this.top; i++) next[i] = this.arr[i];
            this.arr = next;
            this.capacity = newCap;
            return { ok: true, message: `Capacity set to ${newCap}.`, code: `int* next = new int[${newCap}];\ncopy(arr, arr + top + 1, next);\ndelete[] arr; arr = next;` };
        }

        snapshot() { return { capacity: this.capacity, dynamic: this.dynamic, arr: this.arr.slice(), top: this.top }; }
        restore(s) { this.capacity = s.capacity; this.dynamic = s.dynamic; this.arr = s.arr.slice(); this.top = s.top; }
    }

    /* ---------------- LinkedListStack ---------------- */
    let nextAddress = 0x7ffe1000;
    function allocAddress() {
        nextAddress += 0x20 + Math.floor(Math.random() * 6) * 0x10;
        return '0x' + nextAddress.toString(16);
    }

    class LinkedListStack {
        constructor() { this.nodes = []; } // nodes[0] is top
        size() { return this.nodes.length; }
        isEmpty() { return this.nodes.length === 0; }

        push(value) {
            const node = { data: value, address: allocAddress() };
            const prevTop = this.nodes[0] ? this.nodes[0].address : 'nullptr';
            this.nodes.unshift(node);
            return { ok: true, address: node.address, message: `Allocated node ${node.address} holding ${value}; next → ${prevTop}. top = ${node.address}.`,
                code: `Node* newNode = new Node(${value});   // ${node.address}\nnewNode->next = top;                 // ${prevTop}\ntop = newNode;` };
        }

        pop() {
            if (this.isEmpty()) return { ok: false, type: 'underflow', message: 'Stack Underflow: top is nullptr.', code: `if (top == nullptr) throw underflow_error("Stack Underflow");` };
            const node = this.nodes.shift();
            const newTop = this.nodes[0] ? this.nodes[0].address : 'nullptr';
            return { ok: true, value: node.data, address: node.address, message: `Popped ${node.data}; freed ${node.address}. top = ${newTop}.`,
                code: `Node* temp = top;        // ${node.address}\ntop = top->next;         // ${newTop}\nint v = temp->data;      // ${node.data}\ndelete temp;` };
        }

        peek() {
            if (this.isEmpty()) return { ok: false, type: 'underflow', message: 'Stack is empty: top is nullptr.', code: `if (top == nullptr) throw underflow_error("Empty");` };
            return { ok: true, value: this.nodes[0].data, message: `top->data = ${this.nodes[0].data} at ${this.nodes[0].address}.`, code: `return top->data;` };
        }

        search(value) {
            const visited = [];
            for (let i = 0; i < this.nodes.length; i++) {
                visited.push(i);
                if (String(this.nodes[i].data) === String(value)) {
                    return { ok: true, index: i, visited, message: `Found ${value} at node ${this.nodes[i].address} (position ${i + 1} from top).`,
                        code: `for (Node* cur = top; cur; cur = cur->next)\n    if (cur->data == ${value}) return pos;` };
                }
            }
            return { ok: false, type: 'notfound', visited, message: `${value} not found after traversing ${visited.length} node(s).`, code: `// reached nullptr\nreturn -1;` };
        }

        reverse() {
            this.nodes.reverse();
            return { ok: true, message: `Reversed ${this.size()} node(s) by redirecting next pointers.`,
                code: `Node *prev = nullptr, *cur = top;\nwhile (cur) {\n    Node* nxt = cur->next;\n    cur->next = prev;\n    prev = cur; cur = nxt;\n}\ntop = prev;` };
        }

        clear() {
            const n = this.size();
            this.nodes = [];
            return { ok: true, message: `Deleted ${n} node(s) in O(N). top = nullptr.`, code: `while (top) {\n    Node* temp = top;\n    top = top->next;\n    delete temp;\n}` };
        }

        snapshot() { return { nodes: this.nodes.map(n => ({ ...n })) }; }
        restore(s) { this.nodes = s.nodes.map(n => ({ ...n })); }
    }

    /* ---------------- ParenthesesChecker ---------------- */
    const PAIRS = { ')': '(', ']': '[', '}': '{' };
    const OPENERS = '([{';

    function checkParentheses(expr) {
        const stack = [];
        const steps = [];
        for (let i = 0; i < expr.length; i++) {
            const ch = expr[i];
            if (OPENERS.includes(ch)) {
                stack.push({ ch, index: i });
                steps.push({ index: i, token: ch, action: 'push', stack: stack.map(s => s.ch), message: `'${ch}' is an opening bracket: push.` });
            } else if (PAIRS[ch]) {
                if (!stack.length) {
                    steps.push({ index: i, token: ch, action: 'error', stack: [], message: `'${ch}' at position ${i} has no matching opener (stack empty).` });
                    return { balanced: false, errorIndex: i, steps, message: `Unbalanced: unexpected '${ch}' at position ${i}.` };
                }
                const top = stack[stack.length - 1];
                if (top.ch !== PAIRS[ch]) {
                    steps.push({ index: i, token: ch, action: 'error', stack: stack.map(s => s.ch), message: `Mismatch: '${ch}' at ${i} cannot close '${top.ch}' opened at ${top.index}.` });
                    return { balanced: false, errorIndex: i, steps, message: `Unbalanced: '${ch}' at position ${i} does not match '${top.ch}' at position ${top.index}.` };
                }
                stack.pop();
                steps.push({ index: i, token: ch, action: 'pop', stack: stack.map(s => s.ch), message: `'${ch}' matches '${top.ch}': pop.` });
            }
        }
        if (stack.length) {
            const left = stack[stack.length - 1];
            steps.push({ index: expr.length, token: 'EOF', action: 'error', stack: stack.map(s => s.ch), message: `End of input with ${stack.length} unclosed bracket(s).` });
            return { balanced: false, errorIndex: left.index, steps, message: `Unbalanced: '${left.ch}' at position ${left.index} is never closed.` };
        }
        steps.push({ index: expr.length, token: 'EOF', action: 'done', stack: [], message: 'End of input and stack is empty: balanced.' });
        return { balanced: true, steps, message: 'Balanced: every bracket is matched.' };
    }

    /* ---------------- ExpressionConverter ---------------- */
    const PREC = { '^': 3, '*': 2, '/': 2, '%': 2, '+': 1, '-': 1 };
    const isOperator = t => Object.prototype.hasOwnProperty.call(PREC, t);
    const isRightAssoc = t => t === '^';

    function tokenize(expr) {
        const tokens = [];
        const re = /\s*(\d+(?:\.\d+)?|[A-Za-z_]\w*|[-+*/%^()])/y;
        let m;
        let pos = 0;
        expr = expr.trim();
        while (pos < expr.length) {
            re.lastIndex = pos;
            m = re.exec(expr);
            if (!m) throw new Error(`Invalid character '${expr[pos]}' at position ${pos}.`);
            tokens.push(m[1]);
            pos = re.lastIndex;
            while (pos < expr.length && expr[pos] === ' ') pos++;
        }
        return tokens;
    }

    function shuntingYard(tokens, forPrefix) {
        const stack = [];
        const output = [];
        const steps = [];
        const snap = (token, action, message) => steps.push({ token, action, stack: stack.slice(), output: output.slice(), message });

        for (const t of tokens) {
            if (t === '(') {
                stack.push(t);
                snap(t, 'push', `'(' pushed onto the stack.`);
            } else if (t === ')') {
                while (stack.length && stack[stack.length - 1] !== '(') {
                    output.push(stack.pop());
                    snap(t, 'pop', `Pop '${output[output.length - 1]}' to output until '(' is found.`);
                }
                if (!stack.length) throw new Error('Mismatched parentheses: extra closing bracket.');
                stack.pop();
                snap(t, 'discard', `Matching '(' found and discarded.`);
            } else if (isOperator(t)) {
                while (stack.length && isOperator(stack[stack.length - 1])) {
                    const top = stack[stack.length - 1];
                    const shouldPop = forPrefix
                        ? PREC[top] > PREC[t] || (PREC[top] === PREC[t] && isRightAssoc(t))
                        : PREC[top] > PREC[t] || (PREC[top] === PREC[t] && !isRightAssoc(t));
                    if (!shouldPop) break;
                    output.push(stack.pop());
                    snap(t, 'pop', `'${top}' (prec ${PREC[top]}) popped before '${t}' (prec ${PREC[t]}).`);
                }
                stack.push(t);
                snap(t, 'push', `Operator '${t}' pushed (precedence ${PREC[t]}).`);
            } else {
                output.push(t);
                snap(t, 'output', `Operand '${t}' goes straight to output.`);
            }
        }
        while (stack.length) {
            const top = stack.pop();
            if (top === '(') throw new Error('Mismatched parentheses: unclosed opening bracket.');
            output.push(top);
            snap('EOF', 'pop', `End of input: pop remaining '${top}' to output.`);
        }
        return { output, steps };
    }

    function infixToPostfix(expr) {
        const tokens = tokenize(expr);
        if (!tokens.length) throw new Error('Expression is empty.');
        const { output, steps } = shuntingYard(tokens, false);
        return { result: output.join(' '), steps };
    }

    function infixToPrefix(expr) {
        const tokens = tokenize(expr);
        if (!tokens.length) throw new Error('Expression is empty.');
        const reversed = tokens.slice().reverse().map(t => (t === '(' ? ')' : t === ')' ? '(' : t));
        const { output, steps } = shuntingYard(reversed, true);
        steps.unshift({ token: '—', action: 'info', stack: [], output: [], message: `Step 1: reverse the infix and swap brackets → ${reversed.join(' ')}` });
        const result = output.slice().reverse();
        steps.push({ token: '—', action: 'done', stack: [], output: result, message: `Final step: reverse the output → ${result.join(' ')}` });
        return { result: result.join(' '), steps };
    }

    /* ---------------- ExpressionEvaluator ---------------- */
    function evalTokens(expr) {
        const trimmed = expr.trim();
        if (!trimmed) throw new Error('Expression is empty.');
        return /\s/.test(trimmed) ? trimmed.split(/\s+/) : trimmed.split('');
    }

    function apply(op, a, b) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': if (b === 0) throw new Error('Division by zero.'); return a / b;
            case '%': if (b === 0) throw new Error('Modulo by zero.'); return a % b;
            case '^': return Math.pow(a, b);
        }
        throw new Error(`Unknown operator '${op}'.`);
    }

    const fmt = n => (Number.isInteger(n) ? String(n) : String(+n.toFixed(6)));

    function evaluate(expr, mode) {
        const tokens = evalTokens(expr);
        const order = mode === 'prefix' ? tokens.slice().reverse() : tokens;
        const stack = [];
        const steps = [];
        if (mode === 'prefix') {
            steps.push({ token: '—', action: 'info', stack: [], message: 'Prefix: scan tokens right-to-left.' });
        }
        for (const t of order) {
            if (isOperator(t)) {
                if (stack.length < 2) {
                    const err = `Operator '${t}' needs two operands but the stack has ${stack.length}.`;
                    steps.push({ token: t, action: 'error', stack: stack.map(fmt), message: err });
                    return { ok: false, error: err, steps };
                }
                let a, b;
                if (mode === 'prefix') { a = stack.pop(); b = stack.pop(); }
                else { b = stack.pop(); a = stack.pop(); }
                let r;
                try { r = apply(t, a, b); } catch (e) {
                    steps.push({ token: t, action: 'error', stack: stack.map(fmt), message: `${fmt(a)} ${t} ${fmt(b)}: ${e.message}` });
                    return { ok: false, error: e.message, steps };
                }
                stack.push(r);
                steps.push({ token: t, action: 'apply', stack: stack.map(fmt), message: `Pop operands, compute ${fmt(a)} ${t} ${fmt(b)} = ${fmt(r)}, push result.` });
            } else {
                const n = Number(t);
                if (Number.isNaN(n)) {
                    const err = `'${t}' is not a number.`;
                    steps.push({ token: t, action: 'error', stack: stack.map(fmt), message: err });
                    return { ok: false, error: err, steps };
                }
                stack.push(n);
                steps.push({ token: t, action: 'push', stack: stack.map(fmt), message: `Operand ${t} pushed.` });
            }
        }
        if (stack.length !== 1) {
            const err = `Malformed expression: ${stack.length} values remain on the stack.`;
            steps.push({ token: 'EOF', action: 'error', stack: stack.map(fmt), message: err });
            return { ok: false, error: err, steps };
        }
        steps.push({ token: 'EOF', action: 'done', stack: stack.map(fmt), message: `Result = ${fmt(stack[0])}` });
        return { ok: true, value: fmt(stack[0]), steps };
    }

    global.StackEngine = {
        mode: () => (global.Module && global.Module.calledRun ? 'wasm' : 'core'),
        ArrayStack,
        LinkedListStack,
        checkParentheses,
        infixToPostfix,
        infixToPrefix,
        evaluate,
        PREC
    };
})(window);
