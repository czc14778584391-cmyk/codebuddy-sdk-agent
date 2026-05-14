#!/bin/bash
# SVN 智能提交脚本
# 用法:
#   svn_smart_commit.sh                    # 交互模式
#   svn_smart_commit.sh "提交消息"          # 自动模式（AI 生成消息后直接传入）
#   svn_smart_commit.sh -f message.txt     # 从文件读取提交消息

# 获取脚本所在目录,用于引用公共函数库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo "=== SVN 智能提交 ==="
echo ""

# 初始化环境 (检测 OS、检查 SVN、检查工作目录)
init_svn_env

# 显示当前状态
echo "当前 SVN 状态:"
svn status
echo ""

# 检查是否有改动
changed_files=$(svn status | grep -E "^[AMRD]" | wc -l | tr -d ' ')
if [ "$changed_files" -eq 0 ]; then
    echo "✓ 没有需要提交的改动"
    echo ""
    exit 0
fi

echo "发现 $changed_files 个改动文件"
echo ""

# 显示修改文件的 diff
echo "显示修改文件的差异 (前 100 行):"
echo ""
svn diff | head -100
echo ""

# ============================================================
# 获取提交消息
# ============================================================
commit_msg=""

if [ "$1" = "-f" ] && [ -n "$2" ]; then
    if [ -f "$2" ]; then
        commit_msg=$(cat "$2")
    else
        echo "❌ 错误: 文件不存在: $2"
        exit 1
    fi
elif [ -n "$1" ]; then
    commit_msg="$1"
elif [ ! -t 0 ]; then
    commit_msg=$(cat)
else
    echo "请输入提交消息 (推荐格式: 类型: 描述):"
    echo "  类型示例: feat(功能), fix(修复), docs(文档), style(样式), refactor(重构), test(测试), chore(构建)"
    echo ""
    read -p "提交消息: " commit_msg
fi

if [ -z "$commit_msg" ]; then
    echo "❌ 错误: 提交消息不能为空"
    echo ""
    exit 1
fi

# 显示将要提交的消息
echo ""
echo "提交消息:"
echo "────────────────────────────────"
echo "$commit_msg"
echo "────────────────────────────────"
echo ""

# 如果是交互模式（终端输入），需要确认
if [ -t 0 ] && [ -z "$1" ]; then
    read -p "确认提交这些改动? (y/n): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "提交已取消"
        echo ""
        exit 0
    fi
fi

echo ""
echo "正在提交改动..."
echo ""

svn commit -m "$commit_msg"
commit_result=$?

if [ $commit_result -eq 0 ]; then
    echo ""
    echo "✓ 提交成功"
else
    echo ""
    echo "❌ 提交失败"
    echo ""
    exit 1
fi

echo ""
echo "操作完成"
