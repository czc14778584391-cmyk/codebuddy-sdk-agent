#!/bin/bash
# common.sh 公共函数库单元测试
# 用法: bash tests/test_common.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 测试计数
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================
# 测试辅助函数
# ============================================================
assert_equals() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ "$expected" = "$actual" ]; then
        echo "  ✓ PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  ✗ FAIL: $test_name"
        echo "    期望: '$expected'"
        echo "    实际: '$actual'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_exit_code() {
    local test_name="$1"
    local expected_code="$2"
    local actual_code="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ "$expected_code" -eq "$actual_code" ]; then
        echo "  ✓ PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  ✗ FAIL: $test_name"
        echo "    期望退出码: $expected_code"
        echo "    实际退出码: $actual_code"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_contains() {
    local test_name="$1"
    local haystack="$2"
    local needle="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$haystack" | grep -qF -- "$needle"; then
        echo "  ✓ PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  ✗ FAIL: $test_name"
        echo "    输出中未找到: '$needle'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_not_empty() {
    local test_name="$1"
    local value="$2"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ -n "$value" ]; then
        echo "  ✓ PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  ✗ FAIL: $test_name (值为空)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# ============================================================
# 加载被测模块
# ============================================================
# 为了避免 exit 调用影响测试进程，先 source 公共库获取函数定义
# 我们通过子 shell 来隔离有 exit 调用的函数测试
source "${PROJECT_DIR}/scripts/common.sh"

echo "============================================================"
echo "  SVN Skill 单元测试"
echo "============================================================"
echo ""

# ============================================================
# 测试 detect_os
# ============================================================
echo "[测试组] detect_os - 操作系统检测"

result=$(detect_os)
assert_not_empty "detect_os 返回非空值" "$result"

# 验证返回值是已知类型之一
case "$result" in
    macOS|Linux|Windows|未知)
        assert_equals "detect_os 返回有效值 ($result)" "true" "true"
        ;;
    *)
        assert_equals "detect_os 返回有效值" "macOS|Linux|Windows|未知" "$result"
        ;;
esac

# 在当前 macOS 环境下应返回 macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    assert_equals "macOS 环境下返回 macOS" "macOS" "$result"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    assert_equals "Linux 环境下返回 Linux" "Linux" "$result"
fi

echo ""

# ============================================================
# 测试 check_svn_installed
# ============================================================
echo "[测试组] check_svn_installed - SVN 安装检测"

if command -v svn &> /dev/null; then
    check_svn_installed
    assert_exit_code "SVN 已安装时返回 0" 0 $?
    assert_not_empty "SVN_VERSION 变量被设置" "$SVN_VERSION"
    assert_contains "SVN_VERSION 包含 svn" "$SVN_VERSION" "svn"
else
    check_svn_installed
    assert_exit_code "SVN 未安装时返回 1" 1 $?
fi

echo ""

# ============================================================
# 测试 print_install_guide
# ============================================================
echo "[测试组] print_install_guide - 安装指南打印"

output=$(print_install_guide "macOS")
assert_contains "macOS 指南包含 Homebrew" "$output" "Homebrew"
assert_contains "macOS 指南包含 brew install" "$output" "brew install subversion"

output=$(print_install_guide "Linux")
assert_contains "Linux 指南包含 apt-get" "$output" "apt-get"
assert_contains "Linux 指南包含 yum" "$output" "yum install subversion"
assert_contains "Linux 指南包含 dnf" "$output" "dnf install subversion"
assert_contains "Linux 指南包含 pacman" "$output" "pacman"

output=$(print_install_guide "Windows")
assert_contains "Windows 指南包含 Chocolatey" "$output" "Chocolatey"
assert_contains "Windows 指南包含 Scoop" "$output" "Scoop"

output=$(print_install_guide "FreeBSD")
assert_contains "未知系统指南包含官方链接" "$output" "subversion.apache.org"

echo ""

# ============================================================
# 测试 check_svn_working_dir
# ============================================================
echo "[测试组] check_svn_working_dir - SVN 工作目录检测"

# 在临时目录测试非 SVN 目录
tmp_dir=$(mktemp -d)
(
    cd "$tmp_dir"
    check_svn_working_dir
)
assert_exit_code "非 SVN 目录返回 1" 1 $?

# 模拟 .svn 目录
mkdir -p "${tmp_dir}/.svn"
(
    cd "$tmp_dir"
    source "${PROJECT_DIR}/scripts/common.sh"
    check_svn_working_dir
)
assert_exit_code "有 .svn 目录返回 0" 0 $?

# 清理 .svn，测试 _svn 目录
rm -rf "${tmp_dir}/.svn"
mkdir -p "${tmp_dir}/_svn"
(
    cd "$tmp_dir"
    source "${PROJECT_DIR}/scripts/common.sh"
    check_svn_working_dir
)
assert_exit_code "有 _svn 目录返回 0" 0 $?

# 清理临时目录
rm -rf "$tmp_dir"

echo ""

# ============================================================
# 测试 require_svn_working_dir (在子 shell 中测试 exit 行为)
# ============================================================
echo "[测试组] require_svn_working_dir - 非工作目录退出测试"

tmp_dir=$(mktemp -d)
output=$(
    cd "$tmp_dir"
    source "${PROJECT_DIR}/scripts/common.sh"
    require_svn_working_dir 2>&1
)
exit_code=$?
assert_exit_code "非 SVN 目录执行 require_svn_working_dir 退出码为 1" 1 $exit_code
assert_contains "非 SVN 目录输出错误提示" "$output" "不在 SVN 工作目录中"

# 模拟 SVN 工作目录
mkdir -p "${tmp_dir}/.svn"
output=$(
    cd "$tmp_dir"
    source "${PROJECT_DIR}/scripts/common.sh"
    require_svn_working_dir 2>&1
)
exit_code=$?
assert_exit_code "SVN 目录执行 require_svn_working_dir 退出码为 0" 0 $exit_code
assert_contains "SVN 目录输出成功提示" "$output" "当前位于 SVN 工作目录"

rm -rf "$tmp_dir"

echo ""

# ============================================================
# 测试编码设置
# ============================================================
echo "[测试组] 编码设置验证"

assert_not_empty "LANG 环境变量已设置" "$LANG"
assert_contains "LANG 包含 UTF-8" "$LANG" "UTF-8"

echo ""

# ============================================================
# 测试 require_svn (在子 shell 中)
# ============================================================
echo "[测试组] require_svn - SVN 安装要求"

if command -v svn &> /dev/null; then
    output=$(
        source "${PROJECT_DIR}/scripts/common.sh"
        require_svn "macOS" 2>&1
    )
    exit_code=$?
    assert_exit_code "SVN 已安装时 require_svn 退出码为 0" 0 $exit_code
    assert_contains "SVN 已安装时输出版本" "$output" "SVN 已安装"
fi

echo ""

# ============================================================
# 测试脚本文件完整性
# ============================================================
echo "[测试组] 脚本文件完整性检查"

assert_equals "common.sh 存在" "true" "$([ -f "${PROJECT_DIR}/scripts/common.sh" ] && echo true || echo false)"
assert_equals "svn_smart_commit.sh 存在" "true" "$([ -f "${PROJECT_DIR}/scripts/svn_smart_commit.sh" ] && echo true || echo false)"
assert_equals "svn_quick_update.sh 存在" "true" "$([ -f "${PROJECT_DIR}/scripts/svn_quick_update.sh" ] && echo true || echo false)"
assert_equals "check_install_svn.py 存在" "true" "$([ -f "${PROJECT_DIR}/scripts/check_install_svn.py" ] && echo true || echo false)"

# 验证 shell 脚本引用了 common.sh
commit_content=$(cat "${PROJECT_DIR}/scripts/svn_smart_commit.sh")
assert_contains "svn_smart_commit.sh 引用 common.sh" "$commit_content" "common.sh"

update_content=$(cat "${PROJECT_DIR}/scripts/svn_quick_update.sh")
assert_contains "svn_quick_update.sh 引用 common.sh" "$update_content" "common.sh"

# 验证 .sh 使用直接 svn commit -m (Linux/macOS 用)
assert_contains "svn_smart_commit.sh 使用直接 svn commit -m" "$commit_content" "svn commit -m"

# 验证 Windows .bat 文件存在
assert_equals "svn_smart_commit.bat 存在" "true" "$([ -f "${PROJECT_DIR}/scripts/svn_smart_commit.bat" ] && echo true || echo false)"
bat_content=$(cat "${PROJECT_DIR}/scripts/svn_smart_commit.bat")
assert_contains "svn_smart_commit.bat 包含 svn commit" "$bat_content" "svn commit"
assert_contains "svn_smart_commit.bat 使用 -F 文件方式提交" "$bat_content" "svn commit -F"

echo ""

# ============================================================
# 测试 shell 脚本语法
# ============================================================
echo "[测试组] Shell 脚本语法检查"

bash -n "${PROJECT_DIR}/scripts/common.sh" 2>/dev/null
assert_exit_code "common.sh 语法正确" 0 $?

bash -n "${PROJECT_DIR}/scripts/svn_smart_commit.sh" 2>/dev/null
assert_exit_code "svn_smart_commit.sh 语法正确" 0 $?

bash -n "${PROJECT_DIR}/scripts/svn_quick_update.sh" 2>/dev/null
assert_exit_code "svn_quick_update.sh 语法正确" 0 $?

echo ""

# ============================================================
# 测试 Python 脚本语法
# ============================================================
echo "[测试组] Python 脚本语法检查"

if command -v python3 &> /dev/null; then
    python3 -m py_compile "${PROJECT_DIR}/scripts/check_install_svn.py" 2>/dev/null
    assert_exit_code "check_install_svn.py 语法正确" 0 $?
else
    echo "  ⏭ 跳过: python3 未安装"
fi

echo ""

# ============================================================
# 测试中文编码处理
# ============================================================
echo "[测试组] 中文编码处理"

# 测试中文字符串在临时文件中的写入和读取
tmp_file=$(mktemp)
test_msg="feat(用户): 添加用户注册功能"
printf '%s' "$test_msg" > "$tmp_file"
read_msg=$(cat "$tmp_file")
assert_equals "中文消息写入/读取一致" "$test_msg" "$read_msg"
rm -f "$tmp_file"

# 测试带特殊字符的中文
tmp_file=$(mktemp)
test_msg="fix: 修复「引号」和"双引号"的问题"
printf '%s' "$test_msg" > "$tmp_file"
read_msg=$(cat "$tmp_file")
assert_equals "带特殊字符的中文消息写入/读取一致" "$test_msg" "$read_msg"
rm -f "$tmp_file"

echo ""

# ============================================================
# 测试结果汇总
# ============================================================
echo "============================================================"
echo "  测试结果汇总"
echo "============================================================"
echo ""
echo "  总计: $TESTS_RUN"
echo "  通过: $TESTS_PASSED"
echo "  失败: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "  ✓ 所有测试通过!"
    exit 0
else
    echo "  ✗ 有 $TESTS_FAILED 个测试失败"
    exit 1
fi
