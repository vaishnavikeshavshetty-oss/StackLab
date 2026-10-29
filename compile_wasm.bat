@echo off
echo ===================================================
echo  StackLab - WebAssembly Compilation Script (em++)
echo ===================================================
where em++ >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Emscripten compiler (em++) was not found in PATH!
    echo Please install and activate emsdk first:
    echo   git clone https://github.com/emscripten-core/emsdk.git
    echo   cd emsdk
    echo   emsdk.bat install latest
    echo   emsdk.bat activate latest
    echo   emsdk_env.bat
    exit /b 1
)

echo [BUILD] Compiling C++ code to WebAssembly...
em++ -std=c++14 -O3 -Icpp --bind -s WASM=1 -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','stringToUTF8','UTF8ToString']" -s EXPORTED_FUNCTIONS="['_malloc','_free']" -s ALLOW_MEMORY_GROWTH=1 cpp/ArrayStack.cpp cpp/LinkedListStack.cpp cpp/ParenthesesChecker.cpp cpp/ExpressionConverter.cpp cpp/ExpressionEvaluator.cpp cpp/bindings.cpp -o frontend/stacklab.js

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] WebAssembly compiled successfully to frontend/stacklab.js and frontend/stacklab.wasm!
) else (
    echo [ERROR] WebAssembly compilation failed.
)
