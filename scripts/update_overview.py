#!/usr/bin/env python3
"""Regenerate skills/cap-skill/references/overview.md (能力总览卡片) from the repository itself.

Standard library only. Every number on the card is counted from files, never typed by hand;
scripts/validate.py recomputes the card and fails when the stored file differs.

  python3 scripts/update_overview.py          # rewrite the file
  python3 scripts/update_overview.py --check  # exit 1 if the stored file is stale
"""

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RELATIVE_TARGET = Path('skills/cap-skill/references/overview.md')


def count(root=ROOT):
    """Count modules, bundled methods, helper methods, reference documents and libraries."""
    skills = root / 'skills'
    target = root / RELATIVE_TARGET
    registry = json.loads((root / 'modules.json').read_text(encoding='utf-8'))
    modules = registry['modules']
    libraries = sorted(p for p in skills.glob('*/references/library/*') if p.is_dir())
    methods = sum(1 for lib in libraries for item in lib.iterdir()
                  if item.is_dir() and item.name != 'agents')
    helpers = sum(1 for lib in libraries for item in (lib / 'agents').rglob('*.md'))
    documents = sum(1 for p in skills.glob('*/references/**/*.md') if p != target)
    by_kind = {}
    for module in modules:
        by_kind.setdefault(module['kind'], []).append(module['display_name'])
    return {
        'version': registry['version'],
        'modules': len(modules),
        'methods': methods,
        'helpers': helpers,
        'documents': documents,
        'libraries': len(libraries),
        'by_kind': by_kind,
    }


def short(name):
    """船长选品大师 -> 选品"""
    return name.removeprefix('船长').removesuffix('大师')


def card(c):
    kinds = c['by_kind']
    masters = [short(n) for n in kinds.get('business', [])]
    operations = kinds.get('operations', [])
    known = {'hub', 'business', 'operations', 'course', 'foundation', 'maintenance'}
    others = sum(len(v) for k, v in kinds.items() if k not in known)
    total = c['modules'] + c['methods'] + c['helpers']
    parts = [f'{c["modules"]} 个模块', f'{c["methods"]} 项实战方法']
    if c['helpers']:  # editions that ship no helper notes leave them out of the card
        parts.append(f'{c["helpers"]} 套专项助手方法')
    lines = [
        f'船长电商 · Cap-skill（版本 {c["version"]}）',
        '',
        '｜'.join(parts + [f'{c["documents"]} 份方法文档']),
        f'合计 {total} 项能力 = ' + ' + '.join(parts),
        '',
        f'{len(masters)} 位大师：{"、".join(masters)}',
        f'{len(operations)} 条经营主线：{"、".join(operations)}',
    ]
    course, foundation = len(kinds.get('course', [])), len(kinds.get('foundation', []))
    if course or foundation:  # editions without the course flow leave this line out
        lines.append(f'学员课前准备：{course} 个入口 + {foundation} 个基础模块')
    extras = [f'总入口 {len(kinds.get("hub", []))} 个']
    if kinds.get('maintenance'):
        extras.append(f'源码维护 {len(kinds["maintenance"])} 个')
    if others:
        extras.append(f'其他 {others} 个')
    lines += ['另有' + '、'.join(extras), '',
              f'实战方法收录自 {c["libraries"]} 个开源技能库，按船长规则用中文交付。']
    return '\n'.join(lines)


def render(root=ROOT):
    c = count(root)
    start = '直接说你要做的事就行，比如‘评估这个商品’'
    if c['by_kind'].get('course'):
        start += '；学员做课前准备请说‘开始使用’'
    helpers = ('| 专项助手方法 | 各技能库 `agents/` 下的助手方法文件数；是方法内容，不是能独立运行的 agent |\n'
               if c['helpers'] else '')
    return f'''# 能力总览（亮家底）

本文件由仓库脚本 `scripts/update_overview.py` 按实际文件生成，数字不手填，校验器会核对；不要手改。什么时候出这张卡片、什么时候不出，见[总入口](../SKILL.md)的“能力总览”一节。

## 怎么用这张卡片

1. 把“卡片”一节代码块里的内容原样输出给用户：不增删数字，不换成别的说法，不追加出单、收益或效果承诺。
2. 卡片后只接一句怎么开始：“{start}。”
3. 用户追问某个数字怎么来的，按“数字口径”一节回答。

## 卡片

```text
{card(c)}
```

## 数字口径

| 数字 | 怎么数 |
|---|---|
| 模块 | 仓库根 `modules.json` 登记的模块数 |
| 实战方法 | 各模块 `references/library/<技能库>/` 下的方法文件夹数，不含 `agents` |
{helpers}| 方法文档 | 各模块 `references/` 下的 Markdown 文件数，不含本文件 |
| 开源技能库 | `references/library/` 下的技能库文件夹数，原许可证随库保留 |
'''


def main():
    target = ROOT / RELATIVE_TARGET
    text = render()
    if '--check' in sys.argv[1:]:
        ok = target.is_file() and target.read_text(encoding='utf-8') == text
        print('overview.md is up to date' if ok else 'overview.md is stale: run scripts/update_overview.py')
        return 0 if ok else 1
    target.write_text(text, encoding='utf-8')
    c = count()
    print(f'Wrote {RELATIVE_TARGET.as_posix()}: {c["modules"]} modules, {c["methods"]} methods, '
          f'{c["helpers"]} helper methods, {c["documents"]} documents, {c["libraries"]} libraries')
    return 0


if __name__ == '__main__':
    sys.exit(main())
