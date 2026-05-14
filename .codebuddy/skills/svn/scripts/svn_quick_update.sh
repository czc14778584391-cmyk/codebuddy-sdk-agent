#!/bin/bash
# SVN 快速状态检查和更新脚本
# 显示状态并直接更新工作目录

# 获取脚本所在目录,用于引用公共函数库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo "=== SVN 快速状态检查与更新 ==="
echo ""

# 初始化环境 (检测 OS、检查 SVN、检查工作目录)
init_svn_env

# 显示当前状态
echo "当前 SVN 状态:"
svn status
echo ""

# 检查可用的更新
echo "检查可用更新..."
echo ""
UPDATE_DRY=$(svn update --dry-run 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ 检查更新失败"
    echo "$UPDATE_DRY"
    echo ""
    exit 1
fi

echo "$UPDATE_DRY"
echo ""

# 检查是否有可用的更新
if echo "$UPDATE_DRY" | grep -q "^At revision"; then
    echo "✓ 已经是最新版本,无需更新"
    echo ""
    exit 0
fi

# 直接执行更新
echo "正在更新工作目录..."
echo ""

svn update

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 更新完成"
    echo ""
    echo "更新后的状态:"
    svn status
else
    echo ""
    echo "❌ 更新失败"
    echo ""
    exit 1
fi

echo ""
echo "操作完成"
