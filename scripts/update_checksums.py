#!/usr/bin/env python3
"""Regenerate SHA256SUMS.txt for VERSION, modules.json and every file under skills/.

Also writes skills/cap-skill/scripts/release-files.sha256: the same hashes for the files under
skills/ (paths relative to skills/, the list itself left out). It ships inside the hub so that an
install without an install record (npx or a hand copy) can still tell which modules the user
edited before an update replaces anything."""

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


FILE_LIST = 'skills/cap-skill/scripts/release-files.sha256'


def file_list_text(root):
    skills = root / 'skills'
    listing = root / FILE_LIST
    files = sorted(p for p in skills.rglob('*') if p.is_file() and p.name != '.DS_Store' and p != listing)
    return ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(skills).as_posix()}\n'
                   for p in files)


def main():
    (ROOT / FILE_LIST).write_text(file_list_text(ROOT), encoding='utf-8')
    files = [ROOT / 'VERSION', ROOT / 'modules.json'] + sorted(
        p for p in (ROOT / 'skills').rglob('*') if p.is_file() and p.name != '.DS_Store')
    lines = [f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT).as_posix()}'
             for p in files]
    (ROOT / 'SHA256SUMS.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Wrote {len(lines)} checksums')


if __name__ == '__main__':
    main()
