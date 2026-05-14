---
name: svn
description: 当用户需要执行 SVN (Subversion) 操作时使用此技能,包括检出仓库、更新代码、提交改动、查看文件状态或查看提交历史。支持跨平台(macOS、Linux、Windows),自动检测和安装 SVN。触发词包括"拉取代码"、"更新代码"、"提交代码"、"查看状态"、"查看日志"、"svn checkout"、"svn update"、"svn commit"、"svn status"、"svn log"或类似的 SVN 相关任务。
---

# SVN 操作技能

## 技能目的

提供专业的 SVN (Subversion) 版本控制操作知识和工作流程,包括检出仓库、更新工作目录、提交代码、查看文件状态和查看提交历史。

## 使用时机

当用户请求以下任何操作时使用此技能:
- 检出新的 SVN 仓库
- 更新工作目录到最新版本
- 提交代码改动到 SVN
- 检查文件状态或查看差异
- 查看提交历史或日志
- 任何 SVN 相关的版本控制操作

## 环境检查和安装

### 检查 SVN 是否已安装

在执行任何 SVN 命令之前,必须先检查系统是否已安装 SVN:

```bash
# 检查 SVN 命令是否存在
svn --version

# 如果命令不存在,返回错误码,需要安装 SVN
```

### 检测操作系统

使用以下命令检测当前操作系统:

```bash
# macOS
uname -s  # 返回 "Darwin"
sw_vers  # 查看 macOS 版本

# Linux
uname -s  # 返回 "Linux"
cat /etc/os-release  # 查看 Linux 发行版信息

# Windows
echo $OS  # 环境变量
```

### 安装 SVN

#### macOS 安装方法

**方法 1: 使用 Homebrew (推荐)**
```bash
# 检查是否安装了 Homebrew
brew --version

# 安装 SVN
brew install subversion

# 验证安装
svn --version
```

**方法 2: 使用 MacPorts**
```bash
sudo port install subversion
```

**方法 3: 使用官方安装包**
从 https://subversion.apache.org/packages.html 下载 macOS 安装包

#### Linux 安装方法

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install subversion
```

**CentOS/RHEL:**
```bash
sudo yum install subversion
```

**Fedora:**
```bash
sudo dnf install subversion
```

**Arch Linux:**
```bash
sudo pacman -S subversion
```

#### Windows 安装方法

**方法 1: 使用官方安装包**
1. 访问 https://subversion.apache.org/packages.html#windows
2. 下载 Windows 安装包 (例如 CollabNet 或 VisualSVN)
3. 运行安装程序并按照提示完成安装
4. 重启命令提示符或终端

**方法 2: 使用 Chocolatey (推荐)**
```powershell
choco install subversion
```

**方法 3: 使用 Scoop**
```powershell
scoop install subversion
```

**方法 4: 使用 Cygwin**
在 Cygwin 安装程序中选择 "subversion" 包进行安装

### 安装验证

安装完成后,运行以下命令验证:

```bash
svn --version
```

如果输出版本信息,说明安装成功。如果仍提示命令未找到,可能需要:
1. 重启终端或命令提示符
2. 将 SVN 添加到系统 PATH 环境变量
3. 重新登录系统

### 安装失败的常见原因

1. **缺少依赖包**: 安装 SVN 之前需要先安装依赖库(如 OpenSSL、zlib 等)
2. **权限不足**: Linux/macOS 需要使用 sudo 命令或 root 权限
3. **网络问题**: 无法访问包管理器的软件源
4. **包管理器未安装**: 如 Homebrew、Chocolatey 等未安装

### 跨平台命令执行注意事项

- macOS/Linux 使用 `svn` 命令
- Windows 可能需要使用完整路径或确保 SVN 在 PATH 中
- 某些 SVN 命令在不同平台上的参数可能有差异
- 文件路径在不同平台上的格式不同(Windows 使用反斜杠, Unix 使用正斜杠)

## SVN 命令参考

### 检出代码 (Checkout)

从 SVN 仓库检出代码到本地:

```bash
svn checkout <仓库地址> [本地路径]
```

示例:
- `svn checkout https://svn.example.com/repo/trunk` - 检出到默认目录
- `svn checkout https://svn.example.com/repo/trunk ./my-project` - 检出到指定目录
- `svn co https://svn.example.com/repo/trunk` - 使用简写形式

**重要提示**: 检出前先验证仓库地址是否可访问且正确。如果需要身份验证,SVN 会提示输入凭据。

**注意事项**:
- 检出操作会在指定路径创建包含 `.svn` 隐藏目录的工作副本
- `.svn` 目录存储版本控制信息,不要手动删除或修改
- 支持 `svn+ssh://`、`http://`、`https://`、`file://` 等多种协议

### 更新代码 (Update)

将工作目录更新到最新版本:

```bash
svn update [路径]
```

示例:
- `svn update` - 更新当前目录到最新版本
- `svn update ./src` - 更新指定子目录
- `svn up -r 12345` - 更新到指定版本号
- `svn up --force` - 强制更新以尽可能解决冲突

**最佳实践**: 更新前先检查状态,了解潜在的冲突。

**注意事项**:
- 更新前确保本地有未提交的改动已做好备份
- 如果发生冲突,更新后需要手动解决冲突文件
- 使用 `-r` 参数可以回退或更新到历史版本

### 提交代码 (Commit)

将代码改动提交到 SVN 仓库。

**重要要求 — 提交消息必须由 AI 自动生成**:

1. **不要让用户手动输入提交消息**。AI 应根据 `svn status` 和 `svn diff` 的输出自动分析改动内容，按照提交消息规范（参考 `references/commit_message_conventions.md`）自动生成提交消息
2. 提交消息格式: `<类型>(<范围>): <主题描述>`，类型包括 feat/fix/docs/style/refactor/perf/test/chore
3. 如果改动较多，应在消息正文中分条列出主要改动
4. 生成后将消息展示给用户确认，确认后执行提交

---

#### ⚠️ Windows 中文 commit message 编码问题（极其重要，必须遵守）

> **在 Windows 上，绝对禁止使用 `svn commit -m "中文消息"` 直接传递中文！**
>
> 无论是 PowerShell 还是 cmd.exe，命令行参数中的中文会经过系统 ANSI 代码页（GBK/936）编码，
> 而 SVN 服务器期望 UTF-8，导致 commit message 乱码。
>
> **唯一正确的做法：先写 UTF-8 临时文件，再用 `svn commit -F <文件> --encoding UTF-8` 提交。**

---

#### Windows 提交流程（PowerShell 环境，OpenClaw 等 AI 工具适用）

必须严格按以下步骤执行，**不可省略或合并**：

```powershell
# 步骤 1: 将 commit message 写入 UTF-8 临时文件（无 BOM）
$commitMsg = @"
feat(用户): 添加用户注册功能

- 新增注册表单组件
- 添加邮箱验证逻辑
"@
[System.IO.File]::WriteAllText("$env:TEMP\svn_commit_msg.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

# 步骤 2: 使用 -F 从文件读取 commit message 提交
svn commit -F "$env:TEMP\svn_commit_msg.txt" --encoding UTF-8

# 步骤 3: 清理临时文件
Remove-Item "$env:TEMP\svn_commit_msg.txt" -ErrorAction SilentlyContinue
```

**关键说明**：
- `[System.Text.UTF8Encoding]::new($false)` 确保写入 UTF-8 **无 BOM**
- `svn commit -F <file>` 从文件读取消息，绕过命令行参数编码问题
- `--encoding UTF-8` 告诉 SVN 服务器该消息是 UTF-8 编码
- 三者缺一不可

#### Linux / macOS 提交流程

Linux/macOS 终端默认 UTF-8，可以直接用 `-m` 或使用脚本：

```bash
# 方式 1: 使用智能提交脚本
~/.workbuddy/skills/svn/scripts/svn_smart_commit.sh "feat(用户): 添加用户注册功能"

# 方式 2: 直接 svn commit（终端为 UTF-8 环境即可）
svn commit -m "feat(用户): 添加用户注册功能"
```

### 查看文件状态 (Status)

检查文件在工作目录中的状态:

```bash
svn status [路径]
```

示例:
- `svn status` - 显示所有修改的文件
- `svn status -u` - 显示服务器状态更新
- `svn status -v` - 显示详细输出,包含版本号
- `svn st` - 使用简写形式

**状态代码说明**:
- `A` - 已添加(计划添加)
- `M` - 已修改
- `D` - 已删除(计划删除)
- `?` - 未版本化(未跟踪)
- `!` - 缺失(已删除但未计划)
- `C` - 有冲突
- `I` - 被忽略(使用 svn:ignore 属性)
- `~` - 版本化但被其他文件类型替换

**最佳实践**: 提交前始终审查状态,确保只包含预期的改动。

### 查看差异 (Diff)

查看代码改动的详细信息:

```bash
svn diff [路径]
```

示例:
- `svn diff` - 显示所有改动
- `svn diff ./file.txt` - 显示指定文件的改动
- `svn diff -r HEAD:12345` - 比较两个版本之间的差异
- `svn diff --summarize` - 显示改动文件的摘要

**使用场景**: 提交前仔细审查 diff 输出,验证改动的正确性。

**注意事项**:
- diff 输出使用统一的 diff 格式
- `+` 表示新增的行
- `-` 表示删除的行
- 可以使用外部 diff 工具(如 Beyond Compare、vimdiff 等)

### 查看提交历史 (Log)

查看 SVN 仓库的提交历史记录:

```bash
svn log [路径]
```

示例:
- `svn log` - 显示所有提交历史
- `svn log -l 10` - 显示最近 10 次提交
- `svn log -v` - 显示详细输出,包含改动的文件
- `svn log --limit 5 -r HEAD:12345` - 显示版本范围内最近的 5 次提交
- `svn log --stop-on-copy` - 在复制点停止(用于查看分支)

**最佳实践**: 使用 log 了解最近改动,在更新或调查问题前查看。

**其他有用参数**:
- `--xml` - 以 XML 格式输出,便于程序解析
- `--quiet` - 只显示版本号和提交消息
- `-r REV1:REV2` - 查看指定版本范围的历史

### 常用工作流程

#### 日常开发工作流程

```bash
# 1. 检查当前状态
svn status

# 2. 审查改动
svn diff

# 3. 更新到最新版本
svn update

# 4. 如果有冲突,手动解决冲突
# 手动解决后使用 `svn resolve` 标记已解决

# 5. 提交改动 (参照上方"提交代码"章节的平台指引)
# Linux/macOS:
svn commit -m "改动描述"
# Windows (中文消息必须用文件模式,参照提交代码章节):
# [System.IO.File]::WriteAllText(...) + svn commit -F ... --encoding UTF-8
```

#### 新项目设置

```bash
# 1. 检出仓库
svn checkout <仓库地址> ./项目名称

# 2. 验证检出
cd 项目名称
svn status

# 3. 查看最近的历史记录
svn log -l 5
```

#### 问题调查

```bash
# 1. 检查最近的改动
svn log -l 10 -v

# 2. 查看文件历史
svn log -v <文件路径>

# 3. 比较版本
svn diff -r HEAD~1:HEAD <文件路径>
```

## 冲突解决

当发生冲突时:

1. 运行 `svn status` 识别冲突文件(标记为 `C`)
2. 打开冲突文件并手动解决冲突
3. 解决后运行 `svn resolve --accept working <文件路径>` 标记已解决
4. 使用 `svn diff` 验证改动
5. 提交已解决的文件

**冲突标记**:
- `.mine` - 你的改动版本
- `.rOLD` - 服务器上的旧版本
- `.rNEW` - 服务器上的新版本

**解决策略**:
- `--accept working` - 接受当前工作副本的版本
- `--accept base` - 接受基础版本(更新前的版本)
- `--accept theirs-full` - 完全接受对方的版本
- `--accept mine-full` - 完全接受自己的版本
- `--accept theirs-conflict` - 仅冲突部分接受对方的版本
- `--accept mine-conflict` - 仅冲突部分接受自己的版本

## 最佳实践

1. **提交前始终更新**以避免冲突
2. **提交前使用 `svn diff` 审查改动**
3. **撰写清晰的提交消息**,遵循项目规范
4. **频繁提交**,每次提交逻辑完整的改动
5. **定期检查状态**,了解工作目录状态
6. **需要时使用详细参数** (`-v`, `-u`) 获取更多信息
7. **不要提交未经测试的改动**

## 常见问题和解决方案

**问题**: 身份验证失败
- **解决方案**: 验证凭据,检查仓库访问权限

**问题**: 工作副本被锁定
- **解决方案**: 运行 `svn cleanup` 释放锁

**问题**: 版本已过期
- **解决方案**: 提交前运行 `svn update`

**问题**: 连接超时
- **解决方案**: 检查网络连接、仓库地址或 VPN 状态

**问题**: 权限被拒绝
- **解决方案**: 检查文件系统权限,确认 SVN 用户权限

**问题**: 工作副本损坏
- **解决方案**: 删除 `.svn` 目录后重新检出,或使用 `svn checkout --force` 强制恢复

**问题**: 忘记密码
- **解决方案**: macOS/Linux 删除 `~/.subversion/auth/` 下的认证缓存;Windows 删除 `%APPDATA%\Subversion\auth\`

## 工作目录检测

在执行 SVN 命令之前,验证当前工作目录是否为 SVN 工作副本:
- 检查是否存在 `.svn` 目录
- 如果不是 SVN 工作副本,提示用户提供正确的路径或仓库地址

**检测方法**:
```bash
# 方法 1: 检查目录
test -d .svn && echo "是 SVN 工作副本" || echo "不是 SVN 工作副本"

# 方法 2: 使用 svn 命令
svn info > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "是 SVN 工作副本"
else
    echo "不是 SVN 工作副本"
fi
```

## 平台特定注意事项

### macOS/Linux
- 文件路径使用正斜杠 `/`
- 文件名区分大小写
- 隐藏文件以 `.` 开头
- 使用 `ls -a` 查看包括隐藏文件在内的所有文件

### Windows
- 文件路径可以使用反斜杠 `\` 或正斜杠 `/`
- 文件名不区分大小写(FAT32/NTFS 文件系统)
- `.svn` 目录是系统隐藏目录,需要在文件夹选项中启用"显示隐藏文件"
- 命令提示符使用 `dir /a` 查看包括隐藏文件在内的所有文件
- 长路径可能需要启用长路径支持(Windows 10+)

### 跨平台兼容性
- 尽量使用相对路径而非绝对路径
- 避免在文件名中使用特殊字符
- 文件路径中的空格需要用引号括起来
- 使用 `svn info` 命令获取工作副本信息

## SSH 认证配置

当使用 `svn+ssh://` 协议时,需要配置 SSH 密钥认证。

### 配置流程

**在执行 SSH 认证配置时,必须按以下流程操作:**

#### 第 1 步: 询问用户邮箱

在生成密钥之前,**必须先主动询问用户的邮箱地址**,用于标识密钥归属:

> 请提供你的邮箱地址,用于生成 SSH 密钥(例如: yourname@example.com)

等待用户提供邮箱后再继续下一步。

#### 第 2 步: 检查是否已有 SSH 密钥

```bash
# 检查是否已存在 SSH 密钥
ls -la ~/.ssh/id_rsa.pub 2>/dev/null
```

- 如果已存在密钥,询问用户是否要使用现有密钥,还是重新生成
- 如果不存在,继续生成新密钥

#### 第 3 步: 生成 SSH 密钥

使用用户提供的邮箱生成密钥:

```bash
# 将 <用户邮箱> 替换为用户实际提供的邮箱
ssh-keygen -t rsa -b 4096 -C "<用户邮箱>" -f ~/.ssh/id_rsa -N ""
```

参数说明:
- `-t rsa -b 4096`: 使用 4096 位 RSA 算法
- `-C "<用户邮箱>"`: 密钥注释,标识密钥归属
- `-f ~/.ssh/id_rsa`: 密钥保存路径
- `-N ""`: 空密码(可根据用户需要设置密码)

#### 第 4 步: 读取并返回公钥

生成密钥后,**必须主动读取公钥内容并完整返回给用户**:

```bash
cat ~/.ssh/id_rsa.pub
```

将公钥内容完整展示给用户,格式类似:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQ... yourname@example.com
```

#### 第 5 步: 引导用户配置工蜂 (Git/SVN 平台)

向用户提供以下配置指引:

**工蜂 SSH 公钥配置地址:**
- https://git.woa.com/profile/keys

**配置步骤:**
1. 在浏览器中打开上述地址并登录工蜂
2. 点击 **「添加 SSH 密钥」** 按钮
3. 在 **「Key」** 文本框中粘贴上一步返回的完整公钥内容
4. 在 **「Title」** 中填写一个便于识别的名称(如: `我的MacBook` 或 `办公电脑`)
5. 点击 **「Add key」** 保存

**注意事项:**
- 粘贴公钥时确保是完整的一行,不要遗漏或多加换行
- 一个账号可以添加多个 SSH 密钥(对应不同设备)

#### 第 6 步: 验证连接

```bash
# 测试 SSH 连接是否配置成功
ssh -T svn.woa.com
```

如果返回欢迎信息或用户名,说明配置成功。

#### 第 7 步: 配置 SVN SSH 客户端

```bash
# 在 ~/.subversion/config 中设置 SSH 客户端:
# [tunnels] 段落下添加:
ssh = /usr/bin/ssh -i ~/.ssh/id_rsa
```

**Windows 用户**可以使用 TortoiseSVN 或配置 PuTTY 作为 SSH 客户端。

### 完整操作示例

```bash
# 1. 生成密钥 (使用用户提供的邮箱)
ssh-keygen -t rsa -b 4096 -C "yourname@example.com" -f ~/.ssh/id_rsa -N ""

# 2. 查看公钥 (复制输出内容到工蜂)
cat ~/.ssh/id_rsa.pub

# 3. 配置完工蜂后,测试连接
ssh -T svn.woa.com

# 4. 使用 svn+ssh 协议检出代码
svn checkout svn+ssh://svn.woa.com/your-repo/trunk
```
