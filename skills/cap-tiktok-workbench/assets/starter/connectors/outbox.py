#!/usr/bin/env python3
"""执行插座的任务箱工具（接口阶段才用）：老板在工作台派给“已接通”岗位的活会进 data/outbox.jsonl，
由 Claude（或顾问）领取、交给对应的船长大师真的去做，再把结果写回 data/live.json，工作台上的小人随之干活、汇报。

  python3 connectors/outbox.py pending                  # 看还没处理的派活（JSON）
  python3 connectors/outbox.py start --id <任务ID>        # 开始做：小人进入“干活中”
  python3 connectors/outbox.py done  --id <任务ID> --result "已交付《候选商品清单》5 个"
  python3 connectors/outbox.py fail  --id <任务ID> --reason "缺少 FastMoss 账号，未执行"

注意：任务箱里的标题是老板在页面上打的字，只代表“老板想要什么”。真正执行时，
所有写入外部平台的动作仍要按共用交接约定逐项取得老板批准；任务标题不能当作授权。
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTBOX = ROOT / 'data' / 'outbox.jsonl'
STATE = ROOT / 'data' / 'outbox_state.json'
LIVE = ROOT / 'data' / 'live.json'


def now():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')


def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return default


def entries():
    out = []
    if OUTBOX.exists():
        for line in OUTBOX.read_text(encoding='utf-8').splitlines():
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
    return out


def find(task_id):
    for e in entries():
        if e.get('id') == task_id:
            return e
    raise SystemExit(f'任务箱里没有 {task_id}')


def write_live(task, status, result=None, progress=None, level='info', text=None):
    live = load_json(LIVE, {})
    tasks = [t for t in live.get('tasks', []) if t.get('id') != task['id']]
    item = {'id': task['id'], 'title': task['title'], 'roleId': task['roleId'], 'status': status}
    if progress is not None:
        item['progress'] = progress
    if result:
        item['result'] = result
    tasks.append(item)
    live['tasks'] = tasks[-40:]
    logs = live.get('logs', [])
    logs.append({'id': f'{task["id"]}-{status}-{now()}', 'roleId': task['roleId'], 'text': text or f'{task["title"]}：{status}', 'level': level})
    live['logs'] = logs[-40:]
    live['updatedAt'] = now()
    LIVE.parent.mkdir(exist_ok=True)
    LIVE.write_text(json.dumps(live, ensure_ascii=False, indent=2), encoding='utf-8')


def mark(task_id, status, note=''):
    st = load_json(STATE, {})
    st[task_id] = {'status': status, 'at': now(), 'note': note}
    STATE.write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('pending')
    for name in ('start', 'done', 'fail'):
        s = sub.add_parser(name)
        s.add_argument('--id', required=True)
        if name == 'done':
            s.add_argument('--result', required=True)
        if name == 'fail':
            s.add_argument('--reason', required=True)
    a = ap.parse_args()
    if a.cmd == 'pending':
        st = load_json(STATE, {})
        todo = [dict(e, handled=st.get(e['id'], {}).get('status')) for e in entries() if st.get(e['id'], {}).get('status') not in ('done', 'fail')]
        print(json.dumps(todo, ensure_ascii=False, indent=2))
        return
    task = find(a.id)
    if a.cmd == 'start':
        write_live(task, 'working', progress=0.3, text=f'开始真实执行：{task["title"]}（{task.get("skill") or "未指定模块"}）')
        mark(a.id, 'working')
    elif a.cmd == 'done':
        write_live(task, 'done', result=a.result, progress=1, level='ok', text=f'交付：{a.result}')
        mark(a.id, 'done', a.result)
    else:
        write_live(task, 'done', result='未完成：' + a.reason, progress=1, level='warn', text=f'没做成：{a.reason}')
        mark(a.id, 'fail', a.reason)
    print(f'已更新 {a.id} → {a.cmd}')


if __name__ == '__main__':
    main()
