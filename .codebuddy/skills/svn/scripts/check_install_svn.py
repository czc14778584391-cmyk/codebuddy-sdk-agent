#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SVN 环境检查和安装助手
跨平台脚本,用于检测、检查和安装 SVN
"""

import os
import sys
import subprocess
import platform
import re
import io


def run_command(cmd, shell=False):
    """执行命令并返回结果"""
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30
        )
        stdout = result.stdout.decode('utf-8', errors='replace')
        stderr = result.stderr.decode('utf-8', errors='replace')
        return result.returncode == 0, stdout, stderr
    except Exception as e:
        return False, "", str(e)


def detect_os():
    """检测操作系统"""
    system = platform.system()
    
    if system == "Darwin":
        return "macOS", platform.mac_ver()[0]
    elif system == "Linux":
        # 检测 Linux 发行版
        try:
            with open("/etc/os-release", "r") as f:
                content = f.read()
                distro_match = re.search(r'NAME="([^"]+)"', content)
                version_match = re.search(r'VERSION="([^"]+)"', content)
                if distro_match:
                    distro = distro_match.group(1)
                    version = version_match.group(1) if version_match else ""
                    return f"Linux ({distro})", version
        except:
            pass
        return "Linux", ""
    elif system == "Windows":
        return "Windows", platform.version()
    else:
        return system, platform.version()


def check_svn_installed():
    """检查 SVN 是否已安装"""
    success, stdout, stderr = run_command(["svn", "--version"])
    if success:
        # 提取版本信息
        version_line = stdout.split('\n')[0]
        return True, version_line
    return False, None


def get_install_instructions(os_name):
    """获取 SVN 安装指南"""
    instructions = {
        "macOS": [
            "方法 1: 使用 Homebrew (推荐)",
            "  brew install subversion",
            "",
            "方法 2: 使用 MacPorts",
            "  sudo port install subversion",
            "",
            "方法 3: 从官方网站下载",
            "  https://subversion.apache.org/packages.html#macos"
        ],
        "Linux (Ubuntu)": [
            "sudo apt-get update",
            "sudo apt-get install subversion"
        ],
        "Linux (Debian)": [
            "sudo apt-get update",
            "sudo apt-get install subversion"
        ],
        "Linux (CentOS)": [
            "sudo yum install subversion"
        ],
        "Linux (Red Hat)": [
            "sudo yum install subversion"
        ],
        "Linux (Fedora)": [
            "sudo dnf install subversion"
        ],
        "Linux (Arch Linux)": [
            "sudo pacman -S subversion"
        ],
        "Windows": [
            "方法 1: 使用 Chocolatey",
            "  choco install subversion",
            "",
            "方法 2: 使用 Scoop",
            "  scoop install subversion",
            "",
            "方法 3: 下载官方安装包",
            "  https://subversion.apache.org/packages.html#windows"
        ]
    }
    
    # 查找匹配的安装指南
    for key in instructions:
        if key.lower() in os_name.lower() or os_name.lower() in key.lower():
            return instructions[key]
    
    # 默认指南
    return [
        f"请访问 Subversion 官方网站下载适用于 {os_name} 的安装包:",
        "https://subversion.apache.org/packages.html"
    ]


def install_svn(os_name):
    """尝试自动安装 SVN"""
    print(f"\n正在尝试自动安装 SVN ({os_name})...")
    print("注意: 此操作可能需要管理员权限或输入密码")
    
    # macOS
    if "macOS" in os_name:
        # 检查 Homebrew
        success, _, _ = run_command(["brew", "--version"])
        if success:
            print("\n使用 Homebrew 安装...")
            success, _, stderr = run_command(["brew", "install", "subversion"])
            return success, stderr
        
        # 检查 MacPorts
        success, _, _ = run_command(["port", "version"])
        if success:
            print("\n使用 MacPorts 安装...")
            success, _, stderr = run_command(["sudo", "port", "install", "subversion"], shell=True)
            return success, stderr
        
        return False, "未找到 Homebrew 或 MacPorts"
    
    # Linux (Ubuntu/Debian)
    elif "ubuntu" in os_name.lower() or "debian" in os_name.lower():
        print("\n使用 apt-get 安装...")
        success, _, stderr = run_command(["sudo", "apt-get", "update"], shell=True)
        if not success:
            return False, f"apt-get update 失败: {stderr}"
        success, _, stderr = run_command(["sudo", "apt-get", "install", "-y", "subversion"], shell=True)
        return success, stderr
    
    # Linux (CentOS/RHEL)
    elif "centos" in os_name.lower() or "red hat" in os_name.lower():
        print("\n使用 yum 安装...")
        success, _, stderr = run_command(["sudo", "yum", "install", "-y", "subversion"], shell=True)
        return success, stderr
    
    # Linux (Fedora)
    elif "fedora" in os_name.lower():
        print("\n使用 dnf 安装...")
        success, _, stderr = run_command(["sudo", "dnf", "install", "-y", "subversion"], shell=True)
        return success, stderr
    
    # Linux (Arch)
    elif "arch" in os_name.lower():
        print("\n使用 pacman 安装...")
        success, _, stderr = run_command(["sudo", "pacman", "-S", "--noconfirm", "subversion"], shell=True)
        return success, stderr
    
    # Windows
    elif "Windows" in os_name:
        # 检查 Chocolatey
        success, _, _ = run_command(["choco", "--version"])
        if success:
            print("\n使用 Chocolatey 安装...")
            success, _, stderr = run_command(["choco", "install", "-y", "subversion"], shell=True)
            return success, stderr
        
        # 检查 Scoop
        success, _, _ = run_command(["scoop", "--version"])
        if success:
            print("\n使用 Scoop 安装...")
            success, _, stderr = run_command(["scoop", "install", "subversion"], shell=True)
            return success, stderr
        
        return False, "未找到 Chocolatey 或 Scoop,请手动安装"
    
    else:
        return False, f"不支持的操作系统: {os_name}"


def main():
    """主函数"""
    print("=" * 60)
    print("SVN 环境检查和安装助手")
    print("=" * 60)
    print()
    
    # 检测操作系统
    os_name, os_version = detect_os()
    print(f"✓ 操作系统: {os_name}")
    if os_version:
        print(f"✓ 系统版本: {os_version}")
    print()
    
    # 检查 SVN 是否已安装
    is_installed, version_info = check_svn_installed()
    
    if is_installed:
        print("✓ SVN 已安装")
        print(f"  版本信息: {version_info}")
        print()
        print("可以开始使用 SVN 命令了!")
        return 0
    else:
        print("✗ SVN 未安装")
        print()
    
    # 获取安装指南
    instructions = get_install_instructions(os_name)
    print("安装指南:")
    print("-" * 60)
    for line in instructions:
        print(line)
    print("-" * 60)
    print()
    
    # 询问是否自动安装
    print("是否尝试自动安装 SVN? (y/n): ", end="")
    try:
        choice = input().strip().lower()
    except (EOFError, KeyboardInterrupt):
        print("\n\n安装已取消")
        return 1
    
    if choice in ['y', 'yes', '是', '好']:
        success, error_msg = install_svn(os_name)
        
        if success:
            print("\n✓ SVN 安装成功!")
            
            # 验证安装
            is_installed, version_info = check_svn_installed()
            if is_installed:
                print(f"  版本信息: {version_info}")
            
            return 0
        else:
            print(f"\n✗ SVN 安装失败")
            if error_msg:
                print(f"  错误信息: {error_msg}")
            print("\n请参考上面的安装指南手动安装 SVN")
            return 1
    else:
        print("\n安装已取消")
        print("\n请参考上面的安装指南手动安装 SVN")
        return 1


if __name__ == "__main__":
    # 仅在直接运行时设置标准输出编码，避免被导入时产生副作用
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    sys.exit(main())
