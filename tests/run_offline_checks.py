#!/usr/bin/env python3
"""Offline package checks S01-S08 from the acceptance plan. Uses temp dirs only.

Does not touch the real HOME or any installed skills, and makes no network calls.
"""

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RESULTS = []


def record(case, ok, detail):
    RESULTS.append((case, ok, detail))
    print(f'{"PASS" if ok else "FAIL"} {case}: {detail}')


def run(args, cwd=None, home=None):
    env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'HOME': str(home or tempfile.gettempdir())}
    return subprocess.run([sys.executable, '-I', *args], cwd=cwd, env=env,
                          capture_output=True, text=True)


def tree(path):
    return {p.relative_to(path).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(path.rglob('*')) if p.is_file()}


def copy_repo(tmp):
    target = tmp / 'Cap-skill'
    shutil.copytree(ROOT, target, ignore=shutil.ignore_patterns('__pycache__', '.DS_Store', 'dist'))
    return target


def s01_s02_static(tmp):
    result = run([str(ROOT / 'scripts/validate.py')])
    record('S01/S02', result.returncode == 0, result.stdout.strip().splitlines()[0] if result.stdout else result.stderr)


def s03_single_truth_negative(tmp):
    """Validator must reject a duplicated score table and a broken link."""
    repo = copy_repo(tmp / 's03')
    shop = repo / 'skills/cap-tiktok-shop/references/product-selection.md'
    shop.write_text(shop.read_text(encoding='utf-8') + '\n| 价格与利润 | 20 | 重复 |\n[x](../missing.md)\n',
                    encoding='utf-8')
    run([str(repo / 'scripts/update_checksums.py')])
    out = run([str(repo / 'scripts/validate.py')])
    ok = out.returncode == 1 and 'score table' in out.stdout and 'broken link' in out.stdout
    record('S03', ok, 'validator rejects duplicated score table and broken link' if ok else out.stdout[-300:])


def s05_archive_scan(tmp):
    bad = []
    for path in ROOT.rglob('*'):
        if not path.is_file() or 'tests' in path.relative_to(ROOT).parts[:1]:
            continue
        name = path.relative_to(ROOT).as_posix()
        if re.search(r'(^|/)(node_modules|\.runtime|\.git)(/|$)|\.env', name):
            bad.append(name)
        if path.suffix in ('.md', '.json', '.yaml', '.py', '.txt'):
            text = path.read_text(encoding='utf-8')
            if re.search(r'/Users/[A-Za-z0-9._-]+/', text) and path.name != 'run_offline_checks.py':
                bad.append(f'{name}: local path')
    chatwoot_copies = len(list(ROOT.rglob('chatwoot-*'))) + len(list(ROOT.rglob('LICENSE-Chatwoot*')))
    ok = not bad and chatwoot_copies == 0
    record('S05', ok, 'no runtime dirs, env files, local paths or vendored Chatwoot copies' if ok else str(bad[:5]))


def s06_clean_machine(tmp):
    repo = copy_repo(tmp / 's06')
    home = tmp / 's06-home'
    home.mkdir()
    out = run([str(repo / 'scripts/validate.py')], cwd=repo, home=home)
    dest = home / 'skills'
    inst = run([str(repo / 'scripts/install.py'), 'install', '--dest', str(dest)], home=home)
    ok = out.returncode == 0 and inst.returncode == 0 and len([p for p in dest.iterdir() if p.is_dir()]) == 17
    record('S06', ok, 'validate + install from a copy with empty HOME' if ok else out.stdout + inst.stdout[-300:])


def s07_migration(tmp):
    repo = ROOT
    # 7a: only legacy installed
    dest = tmp / 's07a'
    (dest / 'captain-tiktok').mkdir(parents=True)
    (dest / 'captain-tiktok/SKILL.md').write_text('legacy', encoding='utf-8')
    (dest / 'captain-tiktok-ads').mkdir()
    (dest / 'captain-tiktok-ads/SKILL.md').write_text('legacy', encoding='utf-8')
    out = run([str(repo / 'scripts/install.py'), 'install', '--dest', str(dest), '--disable-legacy'])
    manifest = json.loads((dest / '.cap-tiktok-install.json').read_text(encoding='utf-8'))
    ok_a = (out.returncode == 0 and manifest['legacy_found'].get('captain-tiktok') == 'cap-tiktok-prep'
            and not (dest / 'captain-tiktok').exists()
            and (dest / '.cap-tiktok-backup' / manifest['stamp'] / 'captain-tiktok/SKILL.md').is_file())
    record('S07a', ok_a, 'legacy captain-tiktok maps to cap-tiktok-prep and is moved to backup, not deleted')
    # 7b: legacy + new both present without --disable-legacy -> warned, legacy left alone
    dest = tmp / 's07b'
    (dest / 'captain-tiktok-shop').mkdir(parents=True)
    (dest / 'captain-tiktok-shop/SKILL.md').write_text('legacy', encoding='utf-8')
    out = run([str(repo / 'scripts/install.py'), 'install', '--dest', str(dest)])
    ok_b = out.returncode == 0 and 'Both versions may trigger' in out.stdout and (dest / 'captain-tiktok-shop').exists()
    record('S07b', ok_b, 'duplicate legacy entry reported, nothing removed without consent')
    # 7c: local modification of an installed module is not overwritten
    dest = tmp / 's07c'
    run([str(repo / 'scripts/install.py'), 'install', '--dest', str(dest)])
    edited = dest / 'cap-tiktok-shop/SKILL.md'
    edited.write_text(edited.read_text(encoding='utf-8') + '\n本地修改\n', encoding='utf-8')
    unknown = dest / 'cap-tiktok-ads'
    (unknown / 'notes.md').write_text('用户自己的笔记', encoding='utf-8')
    run([str(repo / 'scripts/install.py'), 'install', '--dest', str(dest)])
    out = run([str(repo / 'scripts/install.py'), 'install', '--dest', str(dest)])
    ok_c = out.returncode == 2 and '本地修改' in edited.read_text(encoding='utf-8') and (unknown / 'notes.md').exists()
    record('S07c', ok_c, 'locally edited modules reported as conflicts and left untouched')


def s08_rollback(tmp):
    dest = tmp / 's08'
    (dest / 'captain-tiktok').mkdir(parents=True)
    (dest / 'captain-tiktok/SKILL.md').write_text('legacy-original', encoding='utf-8')
    before = tree(dest)
    run([str(ROOT / 'scripts/install.py'), 'install', '--dest', str(dest), '--disable-legacy'])
    out = run([str(ROOT / 'scripts/install.py'), 'rollback', '--dest', str(dest)])
    after = {k: v for k, v in tree(dest).items() if not k.startswith('.cap-tiktok')}
    ok = out.returncode == 0 and after == before
    record('S08', ok, 'rollback restores the original files and hashes exactly' if ok else out.stdout[-300:])


def main():
    with tempfile.TemporaryDirectory() as raw:
        tmp = Path(raw)
        for case in (s01_s02_static, s03_single_truth_negative, s05_archive_scan,
                     s06_clean_machine, s07_migration, s08_rollback):
            try:
                case(tmp)
            except Exception as error:  # report and continue with remaining cases
                record(case.__name__, False, repr(error))
    failed = [r for r in RESULTS if not r[1]]
    print(f'\n{len(RESULTS) - len(failed)}/{len(RESULTS)} offline checks passed. '
          'S04 (sources/licenses) is reviewed by hand in THIRD_PARTY_NOTICES.md.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
