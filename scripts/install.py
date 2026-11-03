#!/usr/bin/env python3
"""Install, migrate and roll back Cap-skill in a local skills directory.

Standard library only. Never deletes user files: replaced or disabled content is
moved into <dest>/.cap-tiktok-backup/<stamp>/ and recorded in a manifest.

  python3 scripts/install.py install  --dest ~/.claude/skills [--dry-run]
          [--disable-legacy] [--replace-modified] [--only SLUG ...]
  python3 scripts/install.py rollback --dest ~/.claude/skills [--dry-run]
"""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = '.cap-tiktok-install.json'
BACKUP = '.cap-tiktok-backup'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree(path):
    return {p.relative_to(path).as_posix(): digest(p)
            for p in sorted(path.rglob('*')) if p.is_file() and p.name != '.DS_Store'}


def load_registry():
    return json.loads((ROOT / 'modules.json').read_text(encoding='utf-8'))


def closure(modules, wanted):
    picked, todo = set(), list(wanted)
    while todo:
        slug = todo.pop()
        if slug in picked:
            continue
        if slug not in modules:
            sys.exit(f'Unknown module: {slug}')
        picked.add(slug)
        todo.extend(modules[slug]['requires'])
    return sorted(picked)


def install(args):
    registry = load_registry()
    modules = {m['slug']: m for m in registry['modules']}
    legacy = {m['legacy_slug']: m['slug'] for m in registry['modules'] if m['legacy_slug']}
    dest = Path(args.dest).expanduser()
    previous = {}
    if (dest / MANIFEST).is_file():
        previous = json.loads((dest / MANIFEST).read_text(encoding='utf-8')).get('installed', {})
    stamp = time.strftime('%Y%m%d-%H%M%S')
    backup = dest / BACKUP / stamp
    plan = {'version': registry['version'], 'stamp': stamp, 'installed': {},
            'created': [], 'replaced': [], 'unchanged': [], 'conflicts': [],
            'legacy_found': {}, 'legacy_disabled': []}

    for old in sorted(p.name for p in dest.glob('captain-tiktok*') if p.is_dir()):
        plan['legacy_found'][old] = legacy.get(old, '(no v4 mapping)')

    for slug in closure(modules, args.only or list(modules)):
        source, target = ROOT / 'skills' / slug, dest / slug
        new = tree(source)
        if not target.exists():
            plan['created'].append(slug)
        else:
            current = tree(target)
            if current == new:
                plan['unchanged'].append(slug)
            elif previous.get(slug) == current or args.replace_modified:
                plan['replaced'].append(slug)
            else:
                plan['conflicts'].append(slug)
                continue
        plan['installed'][slug] = new

    if args.disable_legacy:
        plan['legacy_disabled'] = sorted(plan['legacy_found'])

    print(json.dumps({k: v for k, v in plan.items() if k != 'installed'},
                     ensure_ascii=False, indent=2))
    if plan['conflicts']:
        print('Conflicts: local edits found that this installer did not write. '
              'They were left untouched. Re-run with --replace-modified to back them up and replace.')
    if plan['legacy_found'] and not args.disable_legacy:
        print('Legacy captain-tiktok* skills are still enabled. Both versions may trigger; '
              're-run with --disable-legacy to move them into the backup folder.')
    if args.dry_run:
        print('Dry run: nothing written.')
        return 0

    dest.mkdir(parents=True, exist_ok=True)
    for slug in plan['replaced']:
        backup.mkdir(parents=True, exist_ok=True)
        shutil.move(str(dest / slug), str(backup / slug))
    for old in plan['legacy_disabled']:
        backup.mkdir(parents=True, exist_ok=True)
        shutil.move(str(dest / old), str(backup / old))
    for slug in plan['created'] + plan['replaced']:
        shutil.copytree(ROOT / 'skills' / slug, dest / slug)
    record = dict(plan)
    record['installed'] = {**previous, **plan['installed']}
    (dest / MANIFEST).write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Installed {len(plan["created"]) + len(plan["replaced"])} module(s) into {dest}')
    return 2 if plan['conflicts'] else 0


def rollback(args):
    dest = Path(args.dest).expanduser()
    path = dest / MANIFEST
    if not path.is_file():
        sys.exit('No install manifest found; nothing to roll back.')
    record = json.loads(path.read_text(encoding='utf-8'))
    backup = dest / BACKUP / record['stamp']
    report = {'removed': [], 'restored': [], 'kept_modified': []}
    for slug in record['created'] + record['replaced']:
        target = dest / slug
        if target.exists() and tree(target) != record['installed'].get(slug):
            report['kept_modified'].append(slug)
            continue
        report['removed'].append(slug)
    for item in record['replaced'] + record['legacy_disabled']:
        if (backup / item).exists():
            report['restored'].append(item)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report['kept_modified']:
        print('Modules edited after install were kept; restore them manually from the backup folder.')
    if args.dry_run:
        print('Dry run: nothing changed.')
        return 0
    for slug in report['removed']:
        if (dest / slug).exists():
            shutil.rmtree(dest / slug)
    for item in report['restored']:
        if not (dest / item).exists():
            shutil.move(str(backup / item), str(dest / item))
    path.rename(dest / f'{MANIFEST}.rolled-back-{record["stamp"]}')
    print('Rollback finished. Platform-side state (stores, ads, messages) is not affected by this.')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest='command', required=True)
    one = sub.add_parser('install')
    one.add_argument('--dest', required=True)
    one.add_argument('--dry-run', action='store_true')
    one.add_argument('--disable-legacy', action='store_true')
    one.add_argument('--replace-modified', action='store_true')
    one.add_argument('--only', nargs='+')
    two = sub.add_parser('rollback')
    two.add_argument('--dest', required=True)
    two.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    return install(args) if args.command == 'install' else rollback(args)


if __name__ == '__main__':
    sys.exit(main())
