#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_install_svn.py 单元测试
用法: python3 tests/test_check_install_svn.py
"""

import os
import sys
import unittest
import importlib.util
import platform

# 添加 scripts 目录到路径
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, "scripts")

# 动态导入 check_install_svn 模块
# 该模块在顶层会替换 sys.stdout/sys.stderr，需要在导入后恢复
spec = importlib.util.spec_from_file_location(
    "check_install_svn",
    os.path.join(SCRIPTS_DIR, "check_install_svn.py")
)
check_install_svn = importlib.util.module_from_spec(spec)

# 保存真正的 stdout/stderr (底层 buffer)
_real_stdout = sys.__stdout__
_real_stderr = sys.__stderr__
_orig_stdout = sys.stdout
_orig_stderr = sys.stderr

spec.loader.exec_module(check_install_svn)

# 恢复 stdout/stderr，确保 unittest 能正常输出
sys.stdout = _orig_stdout
sys.stderr = _orig_stderr


class TestDetectOS(unittest.TestCase):
    """测试操作系统检测"""

    def test_detect_os_returns_tuple(self):
        """detect_os 应返回元组 (os_name, version)"""
        result = check_install_svn.detect_os()
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)

    def test_detect_os_name_not_empty(self):
        """操作系统名称不应为空"""
        os_name, _ = check_install_svn.detect_os()
        self.assertTrue(len(os_name) > 0)

    def test_detect_os_matches_platform(self):
        """检测结果应与 platform.system() 一致"""
        os_name, _ = check_install_svn.detect_os()
        system = platform.system()
        if system == "Darwin":
            self.assertIn("macOS", os_name)
        elif system == "Linux":
            self.assertIn("Linux", os_name)
        elif system == "Windows":
            self.assertIn("Windows", os_name)


class TestRunCommand(unittest.TestCase):
    """测试命令执行"""

    def test_successful_command(self):
        """成功的命令应返回 (True, stdout, stderr)"""
        success, stdout, stderr = check_install_svn.run_command(
            ["printf", "hello"]
        )
        self.assertTrue(success)
        self.assertIn("hello", stdout)

    def test_failed_command(self):
        """失败的命令应返回 (False, ...)"""
        success, _, _ = check_install_svn.run_command(["false"])
        self.assertFalse(success)

    def test_nonexistent_command(self):
        """不存在的命令应返回 (False, ...)"""
        success, _, _ = check_install_svn.run_command(
            ["nonexistent_command_xyz_12345"]
        )
        self.assertFalse(success)

    def test_command_with_ascii_output(self):
        """命令输出应正确返回"""
        success, stdout, _ = check_install_svn.run_command(
            ["printf", "test_output"]
        )
        self.assertTrue(success)
        self.assertIn("test_output", stdout)


class TestCheckSvnInstalled(unittest.TestCase):
    """测试 SVN 安装检测"""

    def test_returns_tuple(self):
        """check_svn_installed 应返回 (bool, str|None)"""
        result = check_install_svn.check_svn_installed()
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)

    def test_installed_returns_version(self):
        """如果 SVN 已安装，应返回版本信息"""
        is_installed, version_info = check_install_svn.check_svn_installed()
        if is_installed:
            self.assertIsNotNone(version_info)
            self.assertIn("svn", version_info.lower())
        else:
            self.assertIsNone(version_info)


class TestGetInstallInstructions(unittest.TestCase):
    """测试安装指南获取"""

    def test_macos_instructions(self):
        """macOS 指南应包含 Homebrew"""
        instructions = check_install_svn.get_install_instructions("macOS")
        self.assertIsInstance(instructions, list)
        text = " ".join(instructions)
        self.assertIn("Homebrew", text)
        self.assertIn("brew install", text)

    def test_ubuntu_instructions(self):
        """Ubuntu 指南应包含 apt-get"""
        instructions = check_install_svn.get_install_instructions("Linux (Ubuntu)")
        text = " ".join(instructions)
        self.assertIn("apt-get", text)

    def test_centos_instructions(self):
        """CentOS 指南应包含 yum"""
        instructions = check_install_svn.get_install_instructions("Linux (CentOS)")
        text = " ".join(instructions)
        self.assertIn("yum", text)

    def test_fedora_instructions(self):
        """Fedora 指南应包含 dnf"""
        instructions = check_install_svn.get_install_instructions("Linux (Fedora)")
        text = " ".join(instructions)
        self.assertIn("dnf", text)

    def test_arch_instructions(self):
        """Arch 指南应包含 pacman"""
        instructions = check_install_svn.get_install_instructions("Linux (Arch Linux)")
        text = " ".join(instructions)
        self.assertIn("pacman", text)

    def test_windows_instructions(self):
        """Windows 指南应包含 Chocolatey"""
        instructions = check_install_svn.get_install_instructions("Windows")
        text = " ".join(instructions)
        self.assertIn("Chocolatey", text)

    def test_unknown_os_instructions(self):
        """未知系统应返回默认指南"""
        instructions = check_install_svn.get_install_instructions("FreeBSD")
        text = " ".join(instructions)
        self.assertIn("subversion.apache.org", text)


class TestScriptIntegrity(unittest.TestCase):
    """测试脚本文件完整性"""

    def test_script_exists(self):
        """check_install_svn.py 文件应存在"""
        self.assertTrue(
            os.path.isfile(os.path.join(SCRIPTS_DIR, "check_install_svn.py"))
        )

    def test_script_has_shebang(self):
        """脚本应有 python3 shebang"""
        with open(os.path.join(SCRIPTS_DIR, "check_install_svn.py"), "r",
                  encoding="utf-8") as f:
            first_line = f.readline()
        self.assertIn("python3", first_line)

    def test_script_has_utf8_encoding(self):
        """脚本应声明 UTF-8 编码"""
        with open(os.path.join(SCRIPTS_DIR, "check_install_svn.py"), "r",
                  encoding="utf-8") as f:
            content = f.read()
        self.assertIn("utf-8", content)

    def test_main_function_exists(self):
        """应有 main 函数"""
        self.assertTrue(hasattr(check_install_svn, "main"))
        self.assertTrue(callable(check_install_svn.main))

    def test_all_functions_exist(self):
        """应有所有必需函数"""
        required_funcs = [
            "run_command",
            "detect_os",
            "check_svn_installed",
            "get_install_instructions",
            "install_svn",
            "main",
        ]
        for func_name in required_funcs:
            self.assertTrue(
                hasattr(check_install_svn, func_name),
                f"缺少函数: {func_name}",
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
