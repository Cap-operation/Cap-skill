# 统一数据插座（公司配置 + 运行状态）

本文件是工作台数据格式的唯一真源。外壳、模拟插座、真实插座和所有零件都只按这里的字段读写；新零件、新接口不得另起一套字段。

## 1. 公司配置 `company.json`（页面读 `data/company.js`）

配置写在工作台文件夹的 `company.json`，由视觉卡、公司卡生成；页面读的是生成器从它写出的 `data/company.js`（内容固定为 `window.WB_COMPANY = { … };`，大括号内是同样的 JSON）。之后改岗位、数字、风格，都改 `company.json`，再用生成器更新：`python3 <本技能文件夹>/scripts/new_workbench.py --company company.json --out . --update`；没装 Cap-skill 的，把同样的改动写进 `data/company.js`，两边保持一致。不改页面代码。

| 字段 | 必填 | 说明 |
|---|---|---|
| `schema` | 是 | 固定 `cap-workbench/1` |
| `company.name` / `slogan` / `mark` | name 必填 | 公司名、口号、Logo 字（默认取名字首字） |
| `company.industry` / `markets` / `team_size` / `audience` | 否 | 访谈结果；`audience` 取 `self` / `team` / `clients`，影响炫酷与实用的比例 |
| `theme.main_scene` | 是 | 首页主场景零件 ID，见[零件清单](parts-catalog.md) |
| `theme.palette` | 是 | `cyber` / `neon` / `aurora` / `amber` / `jade` / `ice` |
| `theme.role_default` | 否 | 岗位没配 `module` 时抽屉里用的零件 |
| `roles[]` | 是，2–14 个 | 每个 AI 岗位一个小人，见下表 |
| `kpis[]` | 是，3–6 个 | 顶栏数字，见下表 |
| `flows[]` | 否 | 流水线：`{ "id", "name", "stages": ["素材","脚本",…] }` |
| `commands.presets` / `placeholder` | 否 | 派活栏的快捷指令（3–5 条老板常说的话）和输入提示 |
| `sim` | 否 | `speed`（1 为正常）、`autoTasks`（默认开）、`autoGap`（毫秒）、`seedTasks[]`（`{roleId,title}`） |
| `live` | 否 | 交付后接数据时才填：`{ "enabled": false, "url": "data/live.json", "interval": 10000, "outbox": "/api/outbox" }`；`outbox` 打开执行插座 |
| `theme.fx` | 否 | 背景氛围，可多选：`grid`（默认）/ `stars` / `rain` / `aurora` / `bokeh` / `scan`；`[]` 为干净背景 |
| `theme.motion` | 否 | 动感强度：`calm` / `normal`（默认）/ `wild`，同时影响小人干活节奏 |
| `theme.celebrate` | 否 | 老板派的任务完成时的特效：`fireworks`（默认）/ `confetti` / `comet` / `none` |
| `theme.opening` | 否 | 开场动画：`boot`（开机自检，各岗位依次上线）/ `reveal`（Logo 亮相）/ `none`（默认） |
| `theme.accent` / `accent2` | 否 | 品牌色（十六进制），覆盖配色里的主色和副色 |

### 岗位 `roles[]`

| 字段 | 说明 |
|---|---|
| `id` | 英文小写，唯一，如 `scout` |
| `name` / `title` / `mark` | 显示名（如“选品专家”）、一句话定位、头像字 |
| `keywords[]` | 老板下令时用于路由的词，如 `选品`、`爆品`、`竞品` |
| `duties[]` | 每天负责的事（来自岗位模板，第 2 步选岗位时带上），模拟插座用它生成日常任务 |
| `outputs[]` | 交付成果名，如“候选商品清单” |
| `results[]` | 可选，完成句模板，可用 `{output}` `{task}` |
| `logs[]` | 可选，干活时的日志模板，可用 `{duty}` `{task}` `{p}` `{n}` |
| `module` | 点开岗位后抽屉里显示的零件 ID |
| `flow` | 可选，该岗位任务走的流水线 ID |
| `color` | 可选，不填按调色板轮换 |
| `socket` | 以后要接的真实数据，如“TikTok Shop 订单”；只写名称，不写密钥 |
| `executor` | 执行插座：`{ "skill": "cap-tiktok-selection", "connected": false }`。`skill` 是以后真正干这个岗位活的船长模块（按[执行插座默认对接](interview.md#执行插座默认对接)）；`connected` 只在接数据阶段该岗位接通后改为 `true`。没有对应模块的岗位 `skill` 留空、加 `"note": "暂无对应模块，只模拟"`，不打开执行插座 |

### 顶栏数字 `kpis[]`

`{ "key", "label", "unit", "prefix", "format": "money|int|pct|num", "decimals", "color", "sim": { "start", "min", "max", "step", "trend", "perTask", "roles": [] } }`

- `sim.step` 让数字随机小幅波动，`trend` 为正时整体上升；`perTask` 表示指定岗位每完成一个任务加多少。
- 模拟数字只为让画面动起来，界面固定显示“模拟”。不得把模拟数字说成老板的真实经营数据，也不得在汇报里引用。

## 2. 运行状态（页面内存，`Workbench.getState()`）

```text
kpis[key]   = { value, delta, source: 'sim' | 'live' }
roles[id]   = { status: 'idle' | 'moving' | 'working' | 'reporting', taskId, progress 0–1, done, seat }
tasks[]     = { id, title, roleId, flowId, stage, progress, status: 'queued' | 'working' | 'done', origin: 'boss' | 'auto' | 'live', result, source }
logs[]      = { t, roleId, text, level: 'info' | 'ok' | 'boss' | 'warn' }
selectedRole, paused, sourceMode[key]
```

事件：`tick`、`task`、`role`、`kpi`、`log`、`dispatch`（老板派活）、`select`、`open`（打开岗位抽屉）、`pause`、`live`、`live-error`。

小人动作约定：`moving` = 走向工位，`working` = 在工位干活，`reporting` = 走到老板处汇报，`idle` = 待命或闲逛。所有主场景零件按这四种状态表现，保证换主场景不用改数据。

## 3. 零件接口

每个零件一个文件夹 `parts/<id>/`，内含 `part.js`（必需）、`part.json`（清单）、素材与 `LICENSE`（第三方来源时必需）。

```js
Workbench.registerPart('<id>', {
  meta: { label: 'PIXEL OFFICE', modes: ['main', 'role'] },
  mount: function (host, wb, opts) {          // opts.mode = 'main' | 'role'；role 模式另有 opts.roleId
    // 在 host 里自己建 canvas/DOM；只通过 wb.getState()、wb.on()、wb.company 取数据
    return { resize: function () {}, destroy: function () {} };
  }
});
```

- 零件不自己造任务、不改 KPI；需要交互（点小人）时调用 `wb.open(roleId)` 或 `wb.select(roleId)`。
- 颜色只用 `wb.roleColor(id)` 和 CSS 变量（`wb.color('accent')`），换调色板自动生效。
- 必须支持容器缩放（`resize`）、`destroy` 时停掉动画循环和监听；`wb.reducedMotion` 为真时降低动效。
- 不加载外部 CDN；需要的库随零件放进文件夹并带许可证。

## 4. 插座接口（数据从哪来）

```js
Workbench.registerSource('<id>', function (wb) { return { start: fn, stop: fn }; });
```

- `sim`：默认插座，按岗位职责生成任务、日志和数字波动，一直开着；被真实插座接管的岗位和数字它自动跳过。
- `live-json`：交付后接数据时打开。页面每隔 `live.interval` 读一次 `live.url`，格式如下；出现在里面的数字和岗位标成“已接通”，其余继续模拟。

```json
{
  "updatedAt": "2026-11-10T09:00:00+08:00",
  "kpis": { "gmv": 1234.5 },
  "roles": { "ads": { "status": "working", "progress": 0.4 } },
  "tasks": [ { "id": "L1", "title": "…", "roleId": "ads", "status": "working", "progress": 0.4, "result": null } ],
  "logs": [ { "id": "log-1", "roleId": "ads", "text": "…", "level": "info" } ]
}
```

- 真实后台的数据由单独的连接脚本整理成上面的格式写入 `data/live.json`（或本机接口返回），**页面和零件不改**。连接脚本的写法见[接数据](build-and-debug.md#接数据可选)。
- 令牌、密码、Cookie 只放在连接脚本的本机配置里，绝不写进 `data/`、页面或零件。
- 读取失败时页面保留上次数据并继续模拟，不显示假数字为“已接通”。

## 5. 执行插座（老板派的活交给真的去做）

数据插座让数字变真；执行插座让“干活”变真。两者都在交付之后、老板要接时才打开，按岗位逐个接。

```text
老板在工作台派活 → 页面路由到岗位 → 该岗位 executor.connected 为真
→ 页面 POST /api/outbox（只有 start_workbench.py 打开时可用，只收本机页面的请求）
→ 追加到 data/outbox.jsonl
→ Claude 领取：python3 connectors/outbox.py pending
→ 交给 executor.skill 指定的船长模块按它自己的规则去做（授权、证据、状态词都按共用交接约定）
→ outbox.py start / done / fail 把进度和结果写进 data/live.json
→ 页面读到后：小人干活 → 汇报 → 庆祝特效；任务标“已接通”
```

- 已接通的岗位不再模拟：不生成模拟日常任务，状态只跟真实结果走。没接通的岗位照常模拟，界面分别标注。
- 任务箱里的标题是老板随手打的字，只代表需求，**不是授权**：任何写入外部平台的动作（改价、开投、发消息、上架）仍要在对话里按对应模块的规则逐项取得批准。只读、出草案类的活可以直接做。
- 执行需要有人（Claude 会话）在跑：宿主没有定时任务时，只在老板让 Claude“看看任务箱”或 Claude 会话开着循环检查时处理，不承诺“派完活自动有人做”。
- 结果写进 `live.json` 的 `result` 只放一句话摘要和成果文件名；成果本身（清单、脚本、报表）存到工作台的 `outputs/` 文件夹或对话里，不放令牌和客户隐私。

## 6. 老板自己的改动 `custom/`

老板或他的 AI 编程工具做的改动只放这里；生成器更新工作台时不动 `custom/`，并按文件是否存在自动挂进 `index.html`。

| 位置 | 用途 | 怎么挂进页面 |
|---|---|---|
| `custom/custom.css` | 自己的样式；颜色只用外壳的 CSS 变量 | `index.html` 的 `CUSTOM-CSS` 标记之间，在外壳样式之后 |
| `custom/custom.js` | 自己的脚本；只通过 `Workbench` 的公开方法取数据，不改 `core/` | `index.html` 的 `CUSTOM-JS` 标记之间，在外壳脚本之后 |
| `custom/parts/<id>/` | 自己的零件，结构同 §3（`part.js`、`part.json`、素材、第三方 `LICENSE`） | `PARTS` 标记里；`company.json` 可以用这个 id 当主场景或岗位模块 |

- 自己零件的 id 不能和零件库里的重名，重名的不用。
- `core/`、`parts/`、`sources/`、`index.html`、`gallery.html`、`AGENTS.md`、`给AI看的说明/` 每次更新都会重写，不在里面改；`CLAUDE.md` 只在没有时新建，老板可以在里面写长期要求。
- 想让自己的零件给别的老板也用，按[新零件入库](parts-catalog.md#新零件入库)走维护流程。
