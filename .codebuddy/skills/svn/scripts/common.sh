#!/bin/bash
# SVN Skill 公共函数库
# 提供操作系统检测、SVN 安装检查、工作目录检查等公共功能

# ============================================================
# 编码设置 - 强制 UTF-8 locale
# ============================================================
# 此文件仅用于 Linux/macOS,Windows 使用 svn_smart_commit.bat
# ============================================================
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# ============================================================
# 操作系统检测
# ============================================================
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Linux"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]]; then
        echo "Windows"
    else
        echo "未知"
    fi
}

# ============================================================
# 打印 SVN 安装指南
# 参数: $1 - 操作系统名称
# ============================================================
print_install_guide() {
    local os_name="$1"
    echo "请根据你的操作系统安装 SVN:"
    echo ""
    case "$os_name" in
        macOS)
            echo "macOS 安装方法:"
            echo "  使用 Homebrew (推荐):"
            echo "    brew install subversion"
            echo ""
            echo "  使用 MacPorts:"
            echo "    sudo port install subversion"
            ;;
        Linux)
            echo "Linux 安装方法:"
            echo "  Ubuntu/Debian:"
            echo "    sudo apt-get update && sudo apt-get install subversion"
            echo ""
            echo "  CentOS/RHEL:"
            echo "    sudo yum install subversion"
            echo ""
            echo "  Fedora:"
            echo "    sudo dnf install subversion"
            echo ""
            echo "  Arch Linux:"
            echo "    sudo pacman -S subversion"
            ;;
        Windows)
            echo "Windows 安装方法:"
            echo "  方法 1: 使用 Chocolatey:"
            echo "    choco install subversion"
            echo ""
            echo "  方法 2: 使用 Scoop:"
            echo "    scoop install subversion"
            echo ""
            echo "  方法 3: 下载官方安装包:"
            echo "    https://subversion.apache.org/packages.html#windows"
            ;;
        *)
            echo "请访问 https://subversion.apache.org/packages.html 查看适用于你系统的安装包"
            ;;
    esac
}

# ============================================================
# 检查 SVN 是否安装
# 返回: 0 - 已安装, 1 - 未安装
# 副作用: 设置全局变量 SVN_VERSION
# ============================================================
check_svn_installed() {
    if ! command -v svn &> /dev/null; then
        return 1
    fi
    SVN_VERSION=$(svn --version | head -1)
    return 0
}

# ============================================================
# 确保 SVN 已安装，未安装则打印指南并退出
# 参数: $1 - 操作系统名称
# ============================================================
require_svn() {
    local os_name="$1"
    if ! check_svn_installed; then
        echo "❌ 错误: 未安装 SVN"
        echo ""
        print_install_guide "$os_name"
        echo ""
        exit 1
    fi
    echo "✓ SVN 已安装: $SVN_VERSION"
    echo ""
}

# ============================================================
# 检查当前目录是否为 SVN 工作目录
# 返回: 0 - 是, 1 - 不是
# ============================================================
check_svn_working_dir() {
    if [ -d ".svn" ] || [ -d "_svn" ]; then
        return 0
    fi
    return 1
}

# ============================================================
# 确保当前目录是 SVN 工作目录，不是则退出
# ============================================================
require_svn_working_dir() {
    if ! check_svn_working_dir; then
        echo "❌ 错误: 不在 SVN 工作目录中 (未找到 .svn 或 _svn 目录)"
        echo "请先导航到 SVN 工作目录,或使用 svn checkout 检出代码"
        echo ""
        exit 1
    fi
    echo "✓ 当前位于 SVN 工作目录"
    echo ""
}

# ============================================================
# 初始化环境：检测 OS、检查 SVN、检查工作目录
# 这是大多数脚本的标准启动流程
# ============================================================
init_svn_env() {
    OS=$(detect_os)
    echo "检测到操作系统: $OS"
    echo ""
    require_svn "$OS"
    require_svn_working_dir
}
