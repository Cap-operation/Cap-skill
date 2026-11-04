# 投流工作台

用户要“工作台”“看板”“刷新工作台”，或要把每日分析做成一页可看的界面时读取本文件。工作台只展示数据和建议，不执行任何广告写入；执行仍按 [执行授权与恢复](authorization-recovery.md) 在对话里确认。

## 固定模板

界面统一使用 [工作台模板](../assets/workbench/index.html)：黑底，TikTok 青色表示普通广告，粉色表示 GMV Max；左侧导航，顶部工具栏，中间是结论条、核心数字、图表和计划表，右侧是今日建议栏。

- 原样使用模板，不改样式、布局、文案和判断规则，不按个人偏好重新设计。用户明确要求改界面时，先说明会偏离统一风格，再改。
- 页面只读取下面五份数据。换账户、换市场、刷新数据都只改数据，不改页面。
- 判断规则写在模板里：普通广告 ROAS 低于保本线是亏钱，高出不到 20% 算接近保本；已暂停、学习中和 GMV Max 的计划不下盈亏结论；GMV Max ROI 只做参考，不和保本线比较。

## 五份数据

数据集 ID 和列名必须与下表一致。金额用账户币种，不换汇；比率用小数（1.5% 写 0.015）。

| 数据集 ID | 每行是什么 | 列 |
|---|---|---|
| `daily` | 近 14 个自然日，每天一行，按账户时区 | `day`（YYYY-MM-DD）、`spend`、`gmv`、`orders`、`paid_spend`、`paid_gmv`、`max_spend`、`max_gmv` |
| `campaigns` | 近 7 天每个计划一行 | `campaign`（名称，唯一）、`type`（`普通广告` / `Smart+` / `GMV Max`）、`status`（`投放中` / `学习中` / `已暂停`）、`spend`、`gmv`、`orders` |
| `creatives` | 近 7 天每条素材一行 | `creative`（名称，唯一）、`campaign`、`spend`、`ctr`、`cvr`、`roas` |
| `suggestions` | 今天的建议，每条一行 | `id`（`1`、`2`…）、`action`、`target`、`reason`、`impact`、`status`（`待你批准` / `只是提醒`） |
| `settings` | 一行 | `breakeven_roas`、`ctr_min`、`cvr_min`、`currency`、`currency_symbol`、`account_name`、`market`、`is_sample`、`updated_at` |

- `paid_*` 是普通广告（含 Smart+），`max_*` 是 GMV Max；`spend`、`gmv` 是两者之和。取不到拆分时如实说明，不把 GMV Max 并进普通广告。
- `breakeven_roas` 按[贡献利润口径](../../cap-skill/references/profit.md)用用户的真实成本算出；成本缺项时先补问，不填估计值。
- `ctr_min`、`cvr_min` 是判断素材的标准，没有用户自己的标准时用 0.015 和 0.02，并告诉用户可以按类目调整。
- `is_sample` 只有在用示例数据演示时为 `true`；接入真实账户后为 `false`，`updated_at` 写本次读取时间（如 `11/4 09:00`）。
- `suggestions` 的每条建议都要能在 `campaigns` 或 `creatives` 里找到依据，`impact` 写清对花费的影响；不写执行结果，执行结果在对话里报告。

## 创建

1. 当前客户端支持 Claude Artifact 的 Dashboard 类型时：从该类型新建一个工作台，标题“投流工作台”；把五份数据作为文件上传并登记为同名数据集（来源写明是 TikTok 官方 MCP 读取的账户数据和读取时间）；页面文件写入模板全文。
2. 不支持生成网页时：在对话里用表格给出同样内容，顺序为结论、今日建议、核心数字、计划表、素材表。
3. 工作台建在使用者自己的账号下，只放他自己的账户数据，不与他人共用同一个工作台。

## 刷新

- 用户说“刷新工作台”：按[分析与优化](analysis-optimization.md)只读读取最新数据，重新生成五份数据，替换数据文件并更新 `updated_at`。页面不重写。
- 每天定时刷新：只有用户要求、且当前客户端支持定时任务时才设置；先说明到点时电脑和客户端要开着。定时任务只刷新数据和建议，不执行广告写入。
- 只在网页上点刷新不会拉取新数据，向用户说明这一点。
- 读取不完整时，在建议栏或对话里说明缺了哪部分，不用旧数据冒充新数据。
