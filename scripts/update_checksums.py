#!/usr/bin/env python3
"""Regenerate SHA256SUMS.txt for VERSION, modules.json and every file under skills/."""

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    files = [ROOT / 'VERSION', ROOT / 'modules.json'] + sorted(
        p for p in (ROOT / 'skills').rglob('*') if p.is_file() and p.name != '.DS_Store')
    lines = [f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT).as_posix()}'
             for p in files]
    (ROOT / 'SHA256SUMS.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Wrote {len(lines)} checksums')


if __name__ == '__main__':
    main()
