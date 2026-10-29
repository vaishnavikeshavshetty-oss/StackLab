# Makefile for StackLab - Advanced Stack Management System
# Supports native compilation (g++) and Emscripten WebAssembly compilation (em++)

CXX = g++
CXXFLAGS = -std=c++14 -Wall -Wextra -O2 -Icpp
EMCXX = em++
EMFLAGS = -std=c++14 -O3 -Icpp --bind \
          -s WASM=1 \
          -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","stringToUTF8","UTF8ToString"]' \
          -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
          -s ALLOW_MEMORY_GROWTH=1

SRCS = cpp/ArrayStack.cpp \
       cpp/LinkedListStack.cpp \
       cpp/ParenthesesChecker.cpp \
       cpp/ExpressionConverter.cpp \
       cpp/ExpressionEvaluator.cpp

TEST_SRCS = $(SRCS) cpp/test_main.cpp
WASM_SRCS = $(SRCS) cpp/bindings.cpp

OUT_DIR = build
FRONTEND_DIR = frontend

.PHONY: all test wasm clean help

all: test

help:
	@echo "Available build targets:"
	@echo "  make test      Build and run native C++ test suite (requires g++)"
	@echo "  make wasm      Compile C++ into frontend/stacklab.js & frontend/stacklab.wasm (requires Emscripten em++)"
	@echo "  make clean     Remove build artifacts"

test: $(TEST_SRCS)
	@mkdir -p $(OUT_DIR)
	$(CXX) $(CXXFLAGS) $(TEST_SRCS) -o $(OUT_DIR)/stacklab_test
	@echo "Native build complete: $(OUT_DIR)/stacklab_test"

wasm: $(WASM_SRCS)
	$(EMCXX) $(EMFLAGS) $(WASM_SRCS) -o $(FRONTEND_DIR)/stacklab.js
	@echo "WebAssembly compilation complete: $(FRONTEND_DIR)/stacklab.js and $(FRONTEND_DIR)/stacklab.wasm"

clean:
	rm -rf $(OUT_DIR)
	rm -f $(FRONTEND_DIR)/stacklab.js $(FRONTEND_DIR)/stacklab.wasm
