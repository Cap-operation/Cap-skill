#!/bin/bash
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then python3 -B start_workbench.py; else echo "没有找到 Python 3，请先安装：https://www.python.org/downloads/"; read -r -p "按回车关闭"; fi
