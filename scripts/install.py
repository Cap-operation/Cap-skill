#!/usr/bin/env python3
"""Install, migrate and roll back Cap-skill in a local skills directory.

Standard library only. Never deletes user files: replaced or disabled content is
moved into <dest>/.cap-tiktok-backup/<stamp>/ and recorded in a manifest.

  python3 scripts/install.py install  --dest ~/.claude/skills [--dry-run]
          [--disable-legacy] [--replace-modified] [--only SLUG ...]
  python3 scripts/install.py rollback --dest ~/.claude/skills [--dry-run]
  python3 scripts/install.py status   --dest ~/.claude/skills   (read-only)

On Windows use `py -3` instead of `python3`.
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


def latest_changes(limit=12):
    path = ROOT / 'CHANGELOG.md'
    if not path.is_file():
        return []
    lines, started = [], False
    for line in path.read_text(encoding='utf-8').splitlines():
        if line.startswith('## '):
            if started:
                break
            started = True
        if started and line.strip():
            lines.append(line)
    return lines[:limit]


def status(args):
    registry = load_registry()
    dest = Path(args.dest).expanduser()
    record = {}
    if (dest / MANIFEST).is_file():
        record = json.loads((dest / MANIFEST).read_text(encoding='utf-8'))
    installed = record.get('installed', {})
    rows = {'up_to_date': [], 'update_available': [], 'modified_locally': [], 'not_installed': []}
    for module in registry['modules']:
        slug = module['slug']
        source, target = ROOT / 'skills' / slug, dest / slug
        if not target.exists():
            rows['not_installed'].append(slug)
            continue
        current, new = tree(target), tree(source)
        if current == new:
            rows['up_to_date'].append(slug)
        elif installed.get(slug) == current:
            rows['update_available'].append(slug)
        else:
            rows['modified_locally'].append(slug)
    report = {'installed_version': record.get('version'), 'repository_version': registry['version'],
              'dest': str(dest), **rows}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if rows['update_available'] or rows['not_installed']:
        print('Run `install` with the same --dest to update.')
    if rows['modified_locally']:
        print('Some modules were edited after install; `install` will report them as conflicts '
              'and leave them untouched unless you add --replace-modified (which backs them up first).')
    if not (rows['update_available'] or rows['not_installed'] or rows['modified_locally']):
        print('Everything is up to date.')
    changes = latest_changes()
    if changes:
        print('\nLatest changes (CHANGELOG.md):')
        print('\n'.join(changes))
    return 0


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors='replace')
        except (AttributeError, ValueError):
            pass
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
    three = sub.add_parser('status')
    three.add_argument('--dest', required=True)
    args = parser.parse_args()
    return {'install': install, 'rollback': rollback, 'status': status}[args.command](args)


if __name__ == '__main__':
    sys.exit(main())
