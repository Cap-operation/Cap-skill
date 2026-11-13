#!/usr/bin/env python3
"""本机启动工作台（只在本机 127.0.0.1 上提供页面，不对外开放）。

平时双击 index.html 就能看；接真实接口后（data/live.json 或本机接口）需要用这个脚本打开，
因为浏览器不允许直接从 file:// 页面读取数据文件。
  python3 start_workbench.py            # 自动找空闲端口并打开浏览器
  python3 start_workbench.py --port 8771 --no-open
  python3 start_workbench.py --check    # 只检查环境
"""

import argparse
import functools
import http.server
import json
import socket
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


OUTBOX = ROOT / 'data' / 'outbox.jsonl'
OUTBOX_FIELDS = ('id', 'title', 'roleId', 'roleName', 'skill', 'createdAt')


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        """执行插座：只接收本机工作台页面发来的派活，追加到 data/outbox.jsonl。"""
        if self.path.split('?')[0] != '/api/outbox':
            return self.send_error(404)
        host = self.headers.get('Host', '')
        origin = self.headers.get('Origin', '')
        if origin != f'http://{host}' or not host.startswith('127.0.0.1:'):
            return self.send_error(403, 'only the local workbench page may post')
        if not self.headers.get('Content-Type', '').startswith('application/json'):
            return self.send_error(415)
        size = int(self.headers.get('Content-Length') or 0)
        if size <= 0 or size > 8000:
            return self.send_error(413)
        try:
            data = json.loads(self.rfile.read(size).decode('utf-8'))
        except ValueError:
            return self.send_error(400)
        entry = {k: str(data.get(k) or '')[:300] for k in OUTBOX_FIELDS}
        if not entry['id'] or not entry['title'] or not entry['roleId']:
            return self.send_error(400)
        entry['status'] = 'pending'
        OUTBOX.parent.mkdir(exist_ok=True)
        with open(OUTBOX, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, fmt, *args):
        pass


def free_port(start):
    for port in range(start, start + 40):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    sys.exit('8761–8800 端口都被占用了，请关掉其他工作台窗口后再试。')


def check():
    ok = True
    if sys.version_info < (3, 8):
        print(f'Python 版本太旧：{sys.version.split()[0]}，需要 3.8 或更新。')
        ok = False
    for need in ('index.html', 'data/company.js', 'core/state.js', 'core/shell.js'):
        if not (ROOT / need).is_file():
            print(f'缺文件：{need}（工作台文件夹不完整，重新生成一次）')
            ok = False
    parts = sorted(p.name for p in (ROOT / 'parts').iterdir()) if (ROOT / 'parts').is_dir() else []
    print('零件：' + ('、'.join(parts) if parts else '没有'))
    print('环境检查' + ('通过' if ok else '未通过'))
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8761)
    ap.add_argument('--no-open', action='store_true')
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    if a.check:
        sys.exit(0 if check() else 1)
    if not check():
        sys.exit(1)
    port = free_port(a.port)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=str(ROOT)))
    url = f'http://127.0.0.1:{port}/index.html'
    print(f'工作台已启动：{url}\n这个窗口别关；关掉窗口工作台就停了。按 Ctrl+C 停止。')
    if not a.no_open:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止。')


if __name__ == '__main__':
    main()
