cmake_minimum_required(VERSION 3.10)
project(StackLab CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(SOURCES
    cpp/ArrayStack.cpp
    cpp/LinkedListStack.cpp
    cpp/ParenthesesChecker.cpp
    cpp/ExpressionConverter.cpp
    cpp/ExpressionEvaluator.cpp
)

include_directories(cpp)

# Native executable for unit testing and CLI demonstration
add_executable(stacklab_test
    ${SOURCES}
    cpp/test_main.cpp
)

# WebAssembly target using Emscripten
if(EMSCRIPTEN)
    add_executable(stacklab_wasm
        ${SOURCES}
        cpp/bindings.cpp
    )
    set_target_properties(stacklab_wasm PROPERTIES
        OUTPUT_NAME "stacklab"
        SUFFIX ".js"
    )
    target_link_options(stacklab_wasm PRIVATE
        "-s" "WASM=1"
        "-s" "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stringToUTF8','UTF8ToString']"
        "-s" "EXPORTED_FUNCTIONS=['_malloc','_free']"
        "-s" "ALLOW_MEMORY_GROWTH=1"
        "--bind"
        "-O3"
    )
endif()
