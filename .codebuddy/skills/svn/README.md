# SVN Skill - 跨平台 SVN 操作工具

## 简介

这是一个跨平台的 SVN (Subversion) 操作 Skill,支持 macOS、Linux 和 Windows 系统。该 Skill 提供了完整的 SVN 版本控制操作指南和自动化脚本。

## 功能特性

- ✅ **跨平台支持**: 支持 macOS、Linux、Windows
- ✅ **自动检测 SVN 安装状态**
- ✅ **自动安装 SVN**: 提供多平台 SVN 安装指南和自动化安装脚本
- ✅ **常用 SVN 操作指南**: 检出、更新、提交、查看状态、查看历史等
- ✅ **自动化脚本**: 快速更新、智能提交等实用脚本
- ✅ **中文文档**: 完全中文化的操作指南和提示信息
- ✅ **中文提交消息支持**: 使用临时文件 + UTF-8 编码传递提交消息,避免乱码
- ✅ **提交消息规范**: 提供规范的提交消息模板和示例
- ✅ **公共函数库**: 抽取 OS 检测、SVN 安装检查等公共逻辑,减少代码重复
- ✅ **单元测试**: 提供 Shell 和 Python 两套完整的单元测试

## 文件结构

```
svn/
├── SKILL.md                              # 主技能文件
├── README.md                             # 说明文档(本文件)
├── scripts/                              # 脚本目录
│   ├── common.sh                        # 公共函数库(OS 检测、SVN 检查等)
│   ├── check_install_svn.py             # 跨平台 SVN 环境检查和安装脚本
│   ├── svn_quick_update.sh              # 快速状态检查和更新脚本
│   └── svn_smart_commit.sh              # 智能提交脚本
├── tests/                                # 单元测试目录
│   ├── test_common.sh                   # Shell 公共函数库测试
│   └── test_check_install_svn.py        # Python 安装脚本测试
└── references/                           # 参考文档目录
    └── commit_message_conventions.md    # 提交消息规范文档
```

## 安装方法

### 通过 WorkBuddy 安装

1. 将 `svn.zip` 文件解压到 `~/.workbuddy/skills/svn/` (用户级) 或项目目录下的 `.workbuddy/skills/svn/` (项目级)
2. 重启 WorkBuddy 以加载 Skill

### 使用说明

安装后,当你在对话中使用以下触发词时,WorkBuddy 会自动加载此 Skill:

- "拉取代码" / "检出代码" / "svn checkout"
- "更新代码" / "更新" / "svn update"
- "提交代码" / "提交" / "svn commit"
- "查看状态" / "查看文件状态" / "svn status"
- "查看日志" / "查看历史" / "svn log"
- 其他 SVN 相关操作

## 使用示例

### 1. 检查和安装 SVN

```bash
# 运行环境检查和安装脚本
python3 ~/.workbuddy/skills/svn/scripts/check_install_svn.py
```

脚本会自动:
- 检测操作系统
- 检查 SVN 是否已安装
- 提供安装指南
- 尝试自动安装 SVN

### 2. 检出代码

```bash
# 检出到当前目录
svn checkout https://svn.example.com/repo/trunk

# 检出到指定目录
svn checkout https://svn.example.com/repo/trunk ./my-project

# 使用 SSH 协议
svn checkout svn+ssh://svn.woa.com/yipinhe/test
```

### 3. 更新代码

#### 方法 1: 使用命令行
```bash
svn update
```

#### 方法 2: 使用自动化脚本
```bash
cd your-svn-project
~/.workbuddy/skills/svn/scripts/svn_quick_update.sh
```

脚本会:
- 检查当前状态
- 检查可用更新
- 交互式确认更新
- 显示更新结果

### 4. 提交代码

#### 方法 1: 使用命令行
```bash
# 检查状态
svn status

# 查看改动
svn diff

# 提交
svn commit -m "feat: 添加新功能"
```

#### 方法 2: 使用自动化脚本
```bash
cd your-svn-project
~/.workbuddy/skills/svn/scripts/svn_smart_commit.sh
```

脚本会:
- 显示当前状态
- 显示改动差异
- 提示输入提交消息
- 交互式确认提交

## 平台特定说明

### macOS
- 推荐使用 Homebrew 安装 SVN: `brew install subversion`
- 也可以使用 MacPorts: `sudo port install subversion`
- 文件路径使用正斜杠 `/`
- `.svn` 目录是隐藏目录

### Linux
- Ubuntu/Debian: `sudo apt-get install subversion`
- CentOS/RHEL: `sudo yum install subversion`
- Fedora: `sudo dnf install subversion`
- Arch Linux: `sudo pacman -S subversion`
- 文件路径使用正斜杠 `/`
- 文件名区分大小写

### Windows
- 推荐使用 Chocolatey: `choco install subversion`
- 也可以使用 Scoop: `scoop install subversion`
- 或下载官方安装包: https://subversion.apache.org/packages.html#windows
- 文件路径可以使用反斜杠 `\` 或正斜杠 `/`
- 文件名不区分大小写
- `.svn` 目录是系统隐藏目录

## 提交消息规范

建议遵循以下提交消息格式:

```
<类型>(<范围>): <主题>

<正文>

<页脚>
```

类型说明:
- **feat**: 新功能
- **fix**: Bug 修复
- **docs**: 文档变更
- **style**: 代码格式变更
- **refactor**: 代码重构
- **perf**: 性能优化
- **test**: 测试相关
- **chore**: 构建工具变更

详细规范请参考 `references/commit_message_conventions.md`

## 常见问题

### Q: SVN 命令未找到?
A: 运行 `check_install_svn.py` 脚本检查和安装 SVN

### Q: 如何查看 SVN 版本?
A: 运行 `svn --version`

### Q: 提交失败提示版本过期?
A: 先运行 `svn update` 更新到最新版本

### Q: 发生冲突怎么办?
A: 
1. 使用 `svn status` 查看冲突文件(标记为 `C`)
2. 手动编辑解决冲突
3. 运行 `svn resolve --accept working <文件>` 标记已解决
4. 再次提交

### Q: 如何查看提交历史?
A: 
- `svn log` - 查看所有历史
- `svn log -l 10` - 查看最近 10 次提交
- `svn log -v` - 显示详细信息

## 脚本使用权限

确保脚本有执行权限:

```bash
# macOS/Linux
chmod +x ~/.workbuddy/skills/svn/scripts/*.sh
chmod +x ~/.workbuddy/skills/svn/scripts/*.py

# Windows PowerShell
# 不需要额外设置权限
```

## 技术支持

如果遇到问题:
1. 检查 SVN 是否正确安装: `svn --version`
2. 查看错误信息并参考 SKILL.md 中的常见问题部分
3. 确保网络连接正常(对于远程仓库)
4. 检查文件系统权限

## 运行测试

```bash
# 运行 Shell 单元测试
bash tests/test_common.sh

# 运行 Python 单元测试
python3 tests/test_check_install_svn.py -v
```

## 版本历史

- **v2.1** (2026-04-01)
  - 修复中文提交消息乱码问题(使用临时文件 + `--encoding UTF-8`)
  - 抽取公共函数到 `scripts/common.sh`,消除脚本间的重复代码
  - 改进 `check_install_svn.py` 的 Python 3.6+ 兼容性
  - 添加 Shell 和 Python 两套完整的单元测试

- **v2.0** (2026-03-24)
  - 添加跨平台支持
  - 添加自动安装功能
  - 全部文档中文化
  - 添加 Python 环境检查脚本

- **v1.0** (初始版本)
  - 基础 SVN 操作指南
  - 自动化脚本
  - 提交消息规范

## 许可证

本 Skill 作为 WorkBuddy 的扩展组件使用,遵循 WorkBuddy 的许可协议。
