# StackLab — Advanced Stack Management System

> **Course:** Data Structures & Algorithms (CE-201)  
> **Target Audience:** Second-Year Computer Engineering Students & Faculty  
> **Project Scope:** Full-stack, interactive educational data structure visualizer powered by modular C++ algorithms, WebAssembly (Emscripten) integration, and modern web technologies.

---

## 🌟 1. Project Overview

**StackLab** is a modern, high-performance educational platform designed to provide intuitive and rigorous visual demonstrations of **Stack Data Structures**. 

Rather than treating the stack as an abstract black box, StackLab allows students to observe the internal mechanics of:
- **Array-based Stacks:** Index pointer arithmetic, fixed and dynamic capacity boundaries, and overflow/underflow handling.
- **Linked-List Stacks:** Dynamic memory heap allocations, pointer redirection (`topNode = newNode`), and explicit deallocation (`delete temp;`).
- **Core Applications:**
  - Nested Bracket Matching (`()`, `{}`, `[]`) with immediate mismatch diagnostics.
  - Infix to Postfix & Prefix Conversion via the Shunting-Yard algorithm with live operator precedence tables.
  - Postfix & Prefix Expression Evaluation featuring step-by-step operand stack calculations.
- **Dual-Stack Architecture:** Undo and Redo operations implemented using two auxiliary stacks.

---

## 🏗️ 2. Architectural Structure

The project is structured with a strict separation of algorithmic logic and presentation:

```
StackLab/
│
├── cpp/                           # Core C++ Data Structure Algorithms
│   ├── ArrayStack.h               # Array stack header & OperationResult structs
│   ├── ArrayStack.cpp             # Push, Pop, Peek, Search, Reverse, Clear, Resize
│   ├── LinkedListStack.h          # Linked-list stack header & Node structs
│   ├── LinkedListStack.cpp        # Dynamic heap memory management & pointer logic
│   ├── ParenthesesChecker.h       # Bracket validator declaration & Step models
│   ├── ParenthesesChecker.cpp     # Bracket matching with mismatch tracking
│   ├── ExpressionConverter.h      # Infix to Postfix/Prefix converter header
│   ├── ExpressionConverter.cpp    # Shunting-yard algorithm & step trace generator
│   ├── ExpressionEvaluator.h      # Arithmetic evaluator header
│   ├── ExpressionEvaluator.cpp    # Postfix/Prefix evaluator with operand stack
│   ├── bindings.cpp               # Emscripten Embind & C-API bindings for WebAssembly
│   └── test_main.cpp              # Comprehensive automated C++ unit test suite
│
├── frontend/                      # Web Frontend (HTML5 / Vanilla CSS3 / JavaScript)
│   ├── index.html                 # Semantic HTML dashboard & 7 module views
│   ├── styles.css                 # Dark navy design, glassmorphism, glowing micro-animations
│   ├── app.js                     # Main application controller, routing & state sync
│   └── components/
│       ├── cpp-engine.js          # C++ Algorithmic Core adapter & WebAssembly bridge
│       ├── visualizer.js          # Graphical rendering engine & step playback controller
│       └── history.js             # Dual-stack Undo/Redo & operation audit logging
│
├── CMakeLists.txt                 # CMake configuration for native & WebAssembly builds
├── Makefile                       # Cross-platform Makefile (test, wasm, clean)
├── compile_wasm.bat               # Windows batch script for Emscripten compilation
├── server.js                      # Zero-dependency local Node.js development server
├── package.json                   # NPM configuration & scripts
└── README.md                      # Comprehensive documentation & engineering guide
```

---

## ⚡ 3. Dual-Engine Architecture (WebAssembly & Algorithmic Core)

To ensure the project works flawlessly across all student computer environments:
1. **WebAssembly Mode (`stacklab.js` / `stacklab.wasm`):**
   - When compiled with the Emscripten SDK (`em++`), the exact C++ binaries execute directly in the browser with near-native speed.
2. **C++ Algorithmic Core Bridge:**
   - If Emscripten is not installed on the host machine, StackLab automatically uses the algorithmic engine (`cpp-engine.js`), which mirrors every single invariant, memory address simulator, pointer manipulation step, and Shunting-Yard rule from the C++ classes.
   - **Zero Fake Data:** Both engines produce 100% genuine algorithmic steps, verifying educational integrity.

---

## 🚀 4. Getting Started & Running Locally

### Prerequisites
- **Node.js** (v14 or higher) OR any static web server (Python 3 `http.server`, VS Code Live Server).
- Optional for compiling C++ to WebAssembly: **Emscripten SDK (emsdk)**.
- Optional for native C++ test suite: **g++** / **clang++** supporting C++14.

### Step 1: Start the Development Server
From the root project directory, run:
```bash
node server.js
```
*(Or alternatively: `npm start`)*

### Step 2: Open in Browser
Visit the following URL in Google Chrome, Microsoft Edge, or Mozilla Firefox:
```
http://localhost:3000
```

---

## ⚙️ 5. Compiling C++ to WebAssembly (Emscripten)

If you have the **Emscripten SDK** installed on your system:

### On Windows:
```cmd
compile_wasm.bat
```

### On Linux / macOS / WSL:
```bash
make wasm
```

### Manual Command:
```bash
em++ -std=c++14 -O3 -Icpp --bind \
  -s WASM=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","stringToUTF8","UTF8ToString"]' \
  -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  cpp/ArrayStack.cpp cpp/LinkedListStack.cpp cpp/ParenthesesChecker.cpp \
  cpp/ExpressionConverter.cpp cpp/ExpressionEvaluator.cpp cpp/bindings.cpp \
  -o frontend/stacklab.js
```
The output files `frontend/stacklab.js` and `frontend/stacklab.wasm` will automatically be loaded by `cpp-engine.js`.

---

## 🧪 6. Testing & Validation

### Automated C++ Test Suite
The C++ core files include `cpp/test_main.cpp`, which rigorously tests all required edge cases:
- Push into empty stack & multiple pushes
- Stack Overflow when capacity is reached
- Stack Underflow when popping empty stack
- Duplicate elements handling
- Search for present and absent elements
- In-place reversal & clear operations
- Balanced and unbalanced bracket configurations
- Shunting-Yard operator precedence (`^` > `*`, `/`, `%` > `+`, `-`)
- Division by zero and modulo by zero detection
- Prefix right-to-left scan order

---

## 📊 7. Algorithmic Complexity Reference

| Operation | Array Stack (Fixed/Dynamic) | Linked-List Stack (Pointers) | Complexity Notes |
| :--- | :---: | :---: | :--- |
| **Push** | **O(1)** | **O(1)** | Array increments index; Linked list updates head pointer. |
| **Pop** | **O(1)** | **O(1)** | Array decrements index; Linked list deallocates top node. |
| **Peek (Top)** | **O(1)** | **O(1)** | Immediate read at index `topIndex` or `head->data`. |
| **Search** | **O(N)** | **O(N)** | Linear traversal required from TOP down to bottom. |
| **Display** | **O(N)** | **O(N)** | Requires visiting all N elements. |
| **Clear** | **O(1)** | **O(N)** | Array resets `topIndex = -1`; Linked list must delete all N nodes. |
| **Auxiliary Space** | **O(N)** | **O(N)** | Array reserves fixed capacity; Linked list stores node pointers. |

---

## 🔮 8. Future Enhancements
- Visual recursion stack simulator for recursive algorithms (e.g. Tower of Hanoi, DFS).
- Memory leak detector visualizer demonstrating dangling pointers.
- Support for infix expressions containing unary minus (`-5 * +3`).

---

**StackLab — Advanced Stack Management System**  
*Department of Computer Engineering | Data Structures Project*
