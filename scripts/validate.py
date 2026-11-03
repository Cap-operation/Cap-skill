#!/usr/bin/env python3
"""Read-only repository checks for Cap-skill, standard library only."""

import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / 'skills'
ERRORS = []
FORBIDDEN_PARTS = {'node_modules', '.runtime', '.git', '__pycache__'}
SECRET_PATTERNS = [
    re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    re.compile(r'\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}'),
    re.compile(r'\bghp_[A-Za-z0-9]{30,}'),
    re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
    re.compile(r'(?i)(?:access|refresh)_token\s*[:=]\s*["\']?[A-Za-z0-9._-]{20,}'),
]
LOCAL_PATH = re.compile(r'(?:/Users/[A-Za-z0-9._-]+|/home/[A-Za-z0-9._-]+|[A-Z]:\\Users\\)')


def check(condition, message):
    if not condition:
        ERRORS.append(message)


def read(path):
    try:
        return path.read_text(encoding='utf-8')
    except (OSError, UnicodeError) as error:
        ERRORS.append(f'{path.relative_to(ROOT)}: {error}')
        return ''


def section(text, start, end):
    if start not in text or end not in text.split(start, 1)[1]:
        ERRORS.append(f'Missing section: {start}')
        return ''
    return text.split(start, 1)[1].split(end, 1)[0]


def check_registry():
    registry = json.loads(read(ROOT / 'modules.json'))
    modules = {m['slug']: m for m in registry['modules']}
    check(len(modules) == len(registry['modules']), 'Duplicate module slug')
    check(registry['product'] == 'Cap-skill v4.0', 'Product display name changed')
    check(registry['install_slug'] in modules, 'Install slug is not a module')
    check(read(ROOT / 'VERSION').strip() == registry['version'], 'VERSION differs from modules.json')
    check(read(SKILLS / 'cap-tiktok-prep/VERSION').strip() == read(ROOT / 'VERSION').strip(),
          'skills/cap-tiktok-prep/VERSION differs from VERSION')
    actual = {p.name for p in SKILLS.iterdir() if p.is_dir()}
    check(actual == set(modules), f'Skill folders differ from modules.json: {sorted(actual ^ set(modules))}')
    names = [m['display_name'] for m in modules.values()]
    check(len(names) == len(set(names)), 'Duplicate display name')
    for slug, module in modules.items():
        for dep in module['requires']:
            check(dep in modules, f'{slug}: unknown dependency {dep}')
        if module['kind'] != 'hub':
            check(registry['install_slug'] in module['requires'],
                  f'{slug}: must require the shared hub')
    return registry, modules


def check_skill_files(modules):
    for slug in sorted(modules):
        text = read(SKILLS / slug / 'SKILL.md')
        front = re.match(r'\A---\n(.*?)\n---(?:\n|$)', text, re.S)
        check(front is not None, f'{slug}: missing frontmatter')
        if not front:
            continue
        lines = front.group(1).splitlines()
        check(f'name: {slug}' in lines, f'{slug}: name does not match folder')
        desc = re.search(r'^description: "(.+)"$', front.group(1), re.M)
        check(desc is not None, f'{slug}: missing quoted description')
        if desc:
            check(30 <= len(desc.group(1)) <= 1024, f'{slug}: description length out of range')
        check(len(text.splitlines()) <= 500, f'{slug}: SKILL.md longer than 500 lines')
        meta = read(SKILLS / slug / 'agents' / 'openai.yaml')
        check('display_name:' in meta and f'${slug}' in meta,
              f'{slug}: agents/openai.yaml missing display name or ${slug} prompt')


def check_links_and_content(modules):
    linked = {slug: set() for slug in modules}
    for path in sorted(SKILLS.rglob('*')):
        rel = path.relative_to(ROOT)
        if not path.is_file():
            continue
        check(not FORBIDDEN_PARTS & set(path.parts), f'{rel}: forbidden runtime file')
        check(not path.name.startswith('.env'), f'{rel}: environment file in package')
        check(path.stat().st_size < 1024 * 1024, f'{rel}: unexpectedly large file')
        if path.suffix not in ('.md', '.yaml', '.json'):
            continue
        text = read(path)
        check('�' not in text, f'{rel}: replacement character')
        check(not LOCAL_PATH.search(text), f'{rel}: machine-specific absolute path')
        for pattern in SECRET_PATTERNS:
            check(not pattern.search(text), f'{rel}: credential-like string')
        check('functions.exec' not in text and 'ALL_TOOLS' not in text,
              f'{rel}: host-specific call name')
        if path.suffix != '.md':
            continue
        owner = path.relative_to(SKILLS).parts[0]
        for link in re.findall(r'\[[^\]]*\]\(([^)\s]+)\)', text):
            target = link.split('#', 1)[0]
            if not target or '://' in target or target.startswith('mailto:'):
                continue
            resolved = (path.parent / target).resolve()
            check(resolved.is_file(), f'{rel}: broken link {link}')
            check(SKILLS.resolve() in resolved.parents, f'{rel}: link leaves skills/: {link}')
            if SKILLS.resolve() in resolved.parents:
                other = resolved.relative_to(SKILLS.resolve()).parts[0]
                if other != owner:
                    linked[owner].add(other)
    for slug, targets in linked.items():
        for other in targets:
            check(other in modules, f'{slug}: links to unknown module {other}')


def check_single_truth():
    texts = {p.relative_to(ROOT).as_posix(): read(p) for p in SKILLS.rglob('*.md')}
    formula = [k for k, t in texts.items() if re.search(r'预计贡献利润\s*\n\s*= 实际成交价', t)]
    check(formula == ['skills/cap-skill/references/profit.md'],
          f'Profit formula must live only in profit.md: {formula}')
    profit_def = re.compile(r'(?:贡献利润|广告前利润|净利润|毛利|保本\s*ROAS)\s*[=＝]')
    copies = [p.relative_to(ROOT).as_posix() for p in sorted(SKILLS.rglob('*'))
              if p.is_file() and p.suffix in ('.md', '.yaml', '.json')
              and p.relative_to(ROOT).as_posix() != 'skills/cap-skill/references/profit.md'
              and profit_def.search(read(p))]
    check(not copies, f'Profit or break-even ROAS formula defined outside profit.md: {copies}')
    score = [k for k, t in texts.items() if re.search(r'\| 价格与利润 \| 20 \|', t)]
    check(score == ['skills/cap-tiktok-selection/references/scoring-and-flow.md'],
          f'Selection score table must live only in scoring-and-flow.md: {score}')
    contract = [k for k, t in texts.items() if '## 流程控制契约（全局硬规则）' in t]
    check(contract == ['skills/cap-tiktok-prep/SKILL.md'],
          f'Course control contract must live only in cap-tiktok-prep: {contract}')
    for key, text in texts.items():
        check(not re.search(r'captain-tiktok(?!-system)', text) or key in {
            'skills/cap-tiktok-prep/SKILL.md'}, f'{key}: stale legacy module name')


def check_course_regression():
    entry = read(SKILLS / 'cap-tiktok-prep/SKILL.md')
    prep = read(SKILLS / 'cap-tiktok-computer-prep/SKILL.md')
    sop = read(SKILLS / 'cap-tiktok-computer-prep/references/computer-prep.md')
    actions = re.findall(r'^\d+\. (.+)$', section(entry, '## 准备动作清单', '## 第一阶段'), re.M)
    check(actions == ['准备手机', '下载爱思助手', '打开 Google', '下载 Chrome', '安装 Chrome',
                      '购买 Google 账号', '修改账号资料', '登录 Google', '登录 NotebookLM',
                      '核对准备结果'], 'Opening action list changed')
    check(re.findall(r'^\| (P\d+) \|', prep, re.M) ==
          ['P01', 'P02', 'P16', 'P17', 'P18', 'P19', 'P20', 'P21', 'P22', 'P23'],
          'Preparation node order changed')
    refusal = '这个问题不在本次课前准备范围内，我不能在这里展开，请联系【船长电商】工作人员。'
    closing = '课前准备工作已完成，请调整好心态，准备开课，祝你学习顺利！'
    check(refusal in entry, 'Missing fixed refusal')
    check(closing in entry and closing in sop, 'Missing fixed completion text')
    check('结束后再问框架外问题仍固定拒答' in entry, 'Missing post-completion boundary')
    check('每条用户消息只处理一次，只作用于当前编号节点' in entry, 'Missing single-step skip rule')
    purchase = section(sop, '## P19：购买 Google 账号', '## P20')
    check(len(re.findall(r'https://[^\s]+', purchase)) == 1, 'Purchase step must have one tutorial URL')
    check('买好后回复：**Google 账号已购买**' in purchase, 'Missing purchase confirmation')
    hub = read(SKILLS / 'cap-skill/SKILL.md')
    check(closing not in hub and refusal not in hub, 'Course-only texts leaked into the hub')
    check('../cap-tiktok-prep/SKILL.md' in hub, 'Hub does not route course scene to prep')


def check_checksums():
    seen = set()
    for line in read(ROOT / 'SHA256SUMS.txt').splitlines():
        match = re.fullmatch(r'([0-9a-f]{64})  (.+)', line)
        if not match:
            ERRORS.append(f'Malformed checksum entry: {line[:60]}')
            continue
        digest, name = match.groups()
        target = (ROOT / name).resolve()
        if ROOT not in target.parents or not target.is_file():
            ERRORS.append(f'Invalid checksum path: {name}')
            continue
        check(name not in seen, f'Duplicate checksum: {name}')
        seen.add(name)
        check(hashlib.sha256(target.read_bytes()).hexdigest() == digest, f'Checksum mismatch: {name}')
    expected = {'VERSION', 'modules.json'} | {
        p.relative_to(ROOT).as_posix() for p in SKILLS.rglob('*') if p.is_file()}
    check(seen == expected, f'Checksum inventory differs: {sorted(seen ^ expected)[:5]}')
    return len(seen)


def main():
    registry, modules = check_registry()
    check_skill_files(modules)
    check_links_and_content(modules)
    check_single_truth()
    check_course_regression()
    hashed = check_checksums()
    if ERRORS:
        print('FAIL\n' + '\n'.join(ERRORS))
        return 1
    print(f'PASS: {registry["product"]} {registry["version"]}, {len(modules)} Skills, '
          f'{hashed} file hashes, links, single-truth and course regression checks')
    print('Static checks only; not a model-behavior, client-installation or live-platform test.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
