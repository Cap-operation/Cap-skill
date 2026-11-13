#!/usr/bin/env python3
"""GitHub 零件侦察：搜索 → 打分 → 隔离下载 → 安全扫描 → 经确认后安装。标准库实现。

用法（详见 references/github-scout.md）：
  python3 github_scout.py search  --kind project --q "pixel office agents" [--limit 8] [--json out.json]
  python3 github_scout.py search  --kind skill   --q "dashboard"
  python3 github_scout.py inspect --repo owner/name --dest <隔离目录>          # 只下载源码压缩包并扫描，不执行任何代码
  python3 github_scout.py install-skill --src <隔离目录里的skill文件夹> --dest <技能目录> [--yes]
  python3 github_scout.py vendor  --src <隔离目录里的文件夹> --workbench <工作台目录> --name <零件名> --repo owner/name [--yes]

规则：
- 搜索词只用通用英文关键词，不带老板公司名、人名、店铺名或任何私人信息。
- 令牌只从环境变量 GITHUB_TOKEN 读取，从不打印、不写文件。
- 下载的东西一律当作不可信数据：不运行其中的安装脚本、不 npm install、不执行二进制。
"""

import argparse
import io
import json
import math
import os
import re
import shutil
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

API = 'https://api.github.com'
UA = 'cap-workbench-scout'
OK_LICENSES = {'mit', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', '0bsd', 'unlicense', 'cc0-1.0', 'zlib'}
REVIEW_LICENSES = {'mpl-2.0', 'lgpl-2.1', 'lgpl-3.0', 'cc-by-4.0', 'cc-by-sa-4.0', 'epl-2.0'}
COPYLEFT = {'gpl-2.0', 'gpl-3.0', 'agpl-3.0'}
BINARY_EXT = {'.exe', '.dll', '.so', '.dylib', '.bin', '.msi', '.pkg', '.dmg', '.app', '.jar', '.class', '.scr', '.bat', '.cmd', '.ps1', '.vbs'}
RISKY = [
    (re.compile(r'curl[^\n|]{0,200}\|\s*(?:ba|z)?sh'), '下载后直接执行（curl | sh）'),
    (re.compile(r'wget[^\n|]{0,200}\|\s*(?:ba|z)?sh'), '下载后直接执行（wget | sh）'),
    (re.compile(r'\beval\s*\(\s*(?:atob|Buffer\.from|unescape)'), '解码后执行（eval + 解码）'),
    (re.compile(r'child_process|subprocess\.(?:Popen|call|run)|os\.system\('), '会启动系统命令'),
    (re.compile(r'(?:ssh-rsa|BEGIN [A-Z ]*PRIVATE KEY)'), '包含密钥样式文本'),
    (re.compile(r'(?:\.ssh/|\.aws/credentials|Keychain|wallet\.dat|Local Storage/leveldb)'), '涉及读取本机凭证目录'),
    (re.compile(r'[A-Za-z0-9+/]{400,}={0,2}'), '超长编码块（可能藏代码）'),
]


def ssl_context():
    """始终校验证书。python.org 版 Mac Python 没装证书时，改用系统证书库，不关闭校验。"""
    ctx = ssl.create_default_context()
    default = ssl.get_default_verify_paths()
    if not os.environ.get('SSL_CERT_FILE') and not (default.openssl_cafile and os.path.exists(default.openssl_cafile)):
        for bundle in ('/etc/ssl/cert.pem', '/etc/ssl/certs/ca-certificates.crt', '/etc/pki/tls/certs/ca-bundle.crt'):
            if os.path.exists(bundle):
                ctx.load_verify_locations(bundle)
                break
    return ctx


CTX = ssl_context()


def open_url(req, timeout):
    try:
        return urllib.request.urlopen(req, timeout=timeout, context=CTX)
    except urllib.error.URLError as e:
        if 'CERTIFICATE_VERIFY_FAILED' in str(e):
            sys.exit('证书校验失败：这台电脑的 Python 没装根证书。Mac 上打开「应用程序 → Python 3.x」运行 Install Certificates.command 后再试（不要关闭证书校验）。')
        raise


def http_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/vnd.github+json'})
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with open_url(req, 20) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code in (403, 429):
            sys.exit('GitHub 限流了（未登录每分钟约 10 次搜索）。等 1 分钟再试，或设置环境变量 GITHUB_TOKEN。')
        if e.code == 422:
            sys.exit('搜索条件不被接受（需要登录才能搜代码文件时也会这样）。换关键词或设置 GITHUB_TOKEN。')
        sys.exit(f'GitHub 返回错误 {e.code}：{url}')
    except (urllib.error.URLError, TimeoutError) as e:
        sys.exit(f'连不上 GitHub（{e}）。按 setup-troubleshoot.md 的「GitHub 打不开」一节排查网络。')


def months_since(iso):
    if not iso:
        return 999
    t = datetime.strptime(iso, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - t).days / 30.4


def license_verdict(spdx):
    s = (spdx or '').lower()
    if s in OK_LICENSES:
        return 'ok', '可商用，保留署名'
    if s in REVIEW_LICENSES:
        return 'review', '有条件，需复核用法'
    if s in COPYLEFT:
        return 'review', '传染性许可，嵌入后整个工作台可能要开源'
    if s in ('', 'noassertion', 'other'):
        return 'reject', '没有可识别的许可证，默认不能用'
    return 'review', '少见许可证，需复核'


def score_repo(item):
    stars = item.get('stargazers_count', 0)
    age = months_since(item.get('pushed_at'))
    lic = (item.get('license') or {}).get('spdx_id')
    verdict, why = license_verdict(lic)
    score = min(40, 8 * math.log10(stars + 1))
    score += 30 if age <= 6 else 20 if age <= 12 else 8 if age <= 24 else 0
    score += 20 if verdict == 'ok' else 8 if verdict == 'review' else -100
    if item.get('archived'):
        score -= 25
    if item.get('size', 0) > 200_000:  # KB
        score -= 10
    if item.get('description'):
        score += 5
    notes = [why]
    if item.get('archived'):
        notes.append('已归档不再维护')
    if age > 24:
        notes.append(f'{int(age)} 个月没更新')
    if item.get('size', 0) > 200_000:
        notes.append('仓库很大（>200MB），只取需要的部分')
    return round(score, 1), verdict, lic or '无', notes


def cmd_search(a):
    words = a.q.strip()
    where = 'in:name,description,readme' if a.readme else 'in:name,description'
    if a.kind == 'skill':
        query = f'{words} skill {where} fork:false'
    else:
        query = f'{words} {where} fork:false archived:false'
    url = f'{API}/search/repositories?' + urllib.parse.urlencode({'q': query, 'per_page': 50})  # 默认按相关度
    data = http_json(url)
    rows = []
    for rank, item in enumerate(data.get('items', [])):
        name = item.get('name', '').lower()
        desc = (item.get('description') or '').lower()
        if a.kind == 'project' and (name.startswith('awesome') or 'curated list' in desc or 'awesome list' in desc):
            continue  # 合集清单不是零件
        sc, verdict, lic, notes = score_repo(item)
        sc = round(sc + max(0, 25 - rank * 1.5), 1)  # 相关度加分：搜索结果越靠前越高
        if verdict == 'reject' and not a.show_rejected:
            continue
        rows.append({
            'repo': item['full_name'], 'url': item['html_url'], 'stars': item.get('stargazers_count', 0),
            'updated': (item.get('pushed_at') or '')[:10], 'license': lic, 'license_verdict': verdict,
            'score': sc, 'desc': (item.get('description') or '')[:140], 'notes': notes,
        })
    rows.sort(key=lambda r: r['score'], reverse=True)
    rows = rows[:a.limit]
    if a.json:
        Path(a.json).write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'关键词：{words}（{a.kind}），共 {data.get("total_count", 0)} 个结果，展示前 {len(rows)} 个：')
    for i, r in enumerate(rows, 1):
        print(f'{i}. {r["repo"]}  ★{r["stars"]}  更新 {r["updated"]}  许可 {r["license"]}  分 {r["score"]}')
        print(f'   {r["desc"]}')
        print(f'   {"；".join(r["notes"])}  {r["url"]}')
    if not rows:
        print('没有合格结果。换更通用的英文关键词，或放宽到 --show-rejected 只做参考。')


def scan_tree(root):
    findings, binaries, big, total, count = [], [], [], 0, 0
    for p in root.rglob('*'):
        if not p.is_file():
            continue
        count += 1
        size = p.stat().st_size
        total += size
        rel = p.relative_to(root).as_posix()
        if p.suffix.lower() in BINARY_EXT:
            binaries.append(rel)
        if size > 5 * 1024 * 1024:
            big.append(f'{rel}（{size // 1024 // 1024}MB）')
        if p.name == 'package.json':
            try:
                scripts = json.loads(p.read_text(encoding='utf-8', errors='ignore')).get('scripts', {})
            except ValueError:
                scripts = {}
            for hook in ('preinstall', 'install', 'postinstall', 'prepare'):
                if hook in scripts:
                    findings.append(f'{rel}: npm {hook} 脚本 → 「{scripts[hook][:80]}」（不要运行 npm install）')
        if p.suffix.lower() in {'.js', '.mjs', '.cjs', '.ts', '.py', '.sh', '.html', '.json', '.md'} and size < 3 * 1024 * 1024:
            text = p.read_text(encoding='utf-8', errors='ignore')
            for pat, label in RISKY:
                if pat.search(text):
                    findings.append(f'{rel}: {label}')
            if p.suffix in {'.js', '.mjs'} and size > 200_000 and text.count('\n') < 20:
                findings.append(f'{rel}: 压缩过的大文件，内容难以审阅（可能只是打包好的库，需对照来源）')
    has_license = any((root / n).exists() for n in ('LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING', 'LICENCE'))
    return {'files': count, 'mb': round(total / 1024 / 1024, 1), 'has_license': has_license,
            'binaries': binaries[:30], 'big_files': big[:30], 'findings': findings[:80]}


def cmd_inspect(a):
    owner_repo = a.repo.strip().strip('/')
    if not re.fullmatch(r'[\w.-]+/[\w.-]+', owner_repo):
        sys.exit('仓库格式应为 owner/name')
    meta = http_json(f'{API}/repos/{owner_repo}')
    sc, verdict, lic, notes = score_repo(meta)
    dest = Path(a.dest).expanduser().resolve() / owner_repo.replace('/', '__')
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    ref = a.ref or meta.get('default_branch', 'main')
    url = f'https://codeload.github.com/{owner_repo}/zip/refs/heads/{urllib.parse.quote(ref)}'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with open_url(req, 120) as r:
            blob = r.read(a.max_mb * 1024 * 1024 + 1)
    except (urllib.error.URLError, TimeoutError) as e:
        sys.exit(f'下载失败（{e}）。按 setup-troubleshoot.md 的「GitHub 打不开」排查。')
    if len(blob) > a.max_mb * 1024 * 1024:
        sys.exit(f'压缩包超过 {a.max_mb}MB，已停止。只需要其中一部分时，请换成更小的仓库或指定子目录手动获取。')
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        for info in z.infolist():
            name = info.filename
            if name.startswith('/') or '..' in Path(name).parts:
                continue  # 防止路径穿越
            target = dest / name
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with z.open(info) as src, open(target, 'wb') as out:
                shutil.copyfileobj(src, out)
    roots = [p for p in dest.iterdir() if p.is_dir()]
    root = roots[0] if len(roots) == 1 else dest
    report = scan_tree(root)
    report.update({'repo': owner_repo, 'ref': ref, 'license': lic, 'license_verdict': verdict,
                   'score': sc, 'notes': notes, 'path': str(root), 'stars': meta.get('stargazers_count', 0)})
    skills = sorted(p.parent.relative_to(root).as_posix() for p in root.rglob('SKILL.md'))
    report['skill_folders'] = skills[:40]
    out = dest / 'scout-report.json'
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'已下载到隔离目录（未执行任何代码）：{root}')
    print(f'许可：{lic}（{"；".join(notes)}）  文件 {report["files"]} 个  {report["mb"]}MB  有LICENSE文件：{"是" if report["has_license"] else "否"}')
    if skills:
        print('发现 skill 文件夹：' + '、'.join(skills[:10]))
    print('风险点：' + ('无' if not report['findings'] and not report['binaries'] else ''))
    for f in report['findings'][:20]:
        print('  - ' + f)
    for b in report['binaries'][:10]:
        print('  - 二进制/可执行文件：' + b)
    print(f'完整报告：{out}')


def confirm(a, what):
    if a.yes:
        return
    ans = input(f'{what}\n确认执行？输入 yes 继续：').strip().lower()
    if ans != 'yes':
        sys.exit('已取消，没有改动任何文件。')


def read_report(src):
    for parent in [src] + list(src.parents)[:4]:
        rep = parent / 'scout-report.json'
        if rep.exists():
            return json.loads(rep.read_text(encoding='utf-8'))
    return None


def cmd_install_skill(a):
    src = Path(a.src).expanduser().resolve()
    if not (src / 'SKILL.md').is_file():
        sys.exit('源文件夹里没有 SKILL.md，不是一个 skill。')
    rep = read_report(src)
    if not rep:
        sys.exit('没找到 scout-report.json：请先用 inspect 下载并扫描，再安装。')
    if rep['license_verdict'] == 'reject':
        sys.exit('许可证不合格，不能安装。')
    m = re.search(r'^name:\s*([\w.-]+)', (src / 'SKILL.md').read_text(encoding='utf-8', errors='ignore'), re.M)
    name = m.group(1) if m else src.name
    dest = Path(a.dest).expanduser().resolve() / name
    if dest.exists():
        sys.exit(f'目标已存在同名 skill：{dest}。不覆盖，请先确认是否同一个。')
    risky = [f for f in rep['findings'] if f.startswith(src.relative_to(Path(rep['path'])).as_posix())] if src != Path(rep['path']) else rep['findings']
    confirm(a, f'将把 skill「{name}」（来自 {rep["repo"]}，许可 {rep["license"]}）复制到 {dest}\n该文件夹风险点 {len(risky)} 条。')
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns('.git', 'node_modules', '__pycache__', '.DS_Store'))
    (dest / 'SOURCE.txt').write_text(f'来源：https://github.com/{rep["repo"]} @ {rep["ref"]}\n许可：{rep["license"]}\n安装方式：github_scout.py install-skill（只复制，未执行代码）\n', encoding='utf-8')
    print(f'已安装：{dest}。重开客户端会话后生效。')


def cmd_vendor(a):
    src = Path(a.src).expanduser().resolve()
    wb = Path(a.workbench).expanduser().resolve()
    if not (wb / 'index.html').is_file() or not (wb / 'data' / 'company.js').is_file():
        sys.exit('目标不是工作台目录（缺 index.html 或 data/company.js）。')
    rep = read_report(src)
    if not rep:
        sys.exit('没找到 scout-report.json：请先用 inspect 下载并扫描。')
    if rep['license_verdict'] == 'reject':
        sys.exit('许可证不合格，不能放进工作台。')
    name = re.sub(r'[^a-z0-9-]', '-', a.name.lower()).strip('-')
    dest = wb / 'vendor' / name
    if dest.exists():
        sys.exit(f'{dest} 已存在，不覆盖。')
    confirm(a, f'将把 {src.name}（{rep["repo"]}，许可 {rep["license"]}）复制到 {dest}，并登记到 THIRD_PARTY_NOTICES.txt。')
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns('.git', 'node_modules', '__pycache__', '.DS_Store', '*.exe', '*.dll', '*.so', '*.dylib'))
    notice = wb / 'THIRD_PARTY_NOTICES.txt'
    with open(notice, 'a', encoding='utf-8') as f:
        f.write(f'\n{name}\n  来源：https://github.com/{rep["repo"]} @ {rep["ref"]}\n  许可：{rep["license"]}（原许可证文件随 vendor/{name} 保留）\n  用途：工作台零件素材/代码，按需改造\n')
    print(f'已放入：{dest}，并已登记来源。下一步按 parts-catalog.md 包装成零件。')


def main():
    p = argparse.ArgumentParser(description='GitHub 零件侦察')
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('search')
    s.add_argument('--kind', choices=['project', 'skill'], default='project')
    s.add_argument('--q', required=True)
    s.add_argument('--limit', type=int, default=8)
    s.add_argument('--json')
    s.add_argument('--show-rejected', action='store_true')
    s.add_argument('--readme', action='store_true', help='也在 README 里搜（结果更多但更杂）')
    i = sub.add_parser('inspect')
    i.add_argument('--repo', required=True)
    i.add_argument('--dest', required=True)
    i.add_argument('--ref')
    i.add_argument('--max-mb', type=int, default=80)
    k = sub.add_parser('install-skill')
    k.add_argument('--src', required=True)
    k.add_argument('--dest', required=True)
    k.add_argument('--yes', action='store_true')
    v = sub.add_parser('vendor')
    v.add_argument('--src', required=True)
    v.add_argument('--workbench', required=True)
    v.add_argument('--name', required=True)
    v.add_argument('--repo')
    v.add_argument('--yes', action='store_true')
    a = p.parse_args()
    {'search': cmd_search, 'inspect': cmd_inspect, 'install-skill': cmd_install_skill, 'vendor': cmd_vendor}[a.cmd](a)


if __name__ == '__main__':
    main()
