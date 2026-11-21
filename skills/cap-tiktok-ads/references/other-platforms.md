# 其他平台广告诊断

用户同时在 Meta、Google、亚马逊等平台投放，要一起看效果或做跨平台计划时读取本文件。

## 范围

- **只读诊断**：基于用户导出的报表或截图做体检、对比和计划；本模块不连接这些平台的账户，也不执行任何写入。用户要改其他平台的广告时，给出操作步骤，由用户在对应后台完成。
- TikTok 广告仍按本模块的官方 MCP 流程处理；参考库的 TikTok 部分只作补充视角。
- 利润和保本线只用[贡献利润口径](../../cap-skill/references/profit.md)；不同平台的归因口径不同，分开列示，不相加成一个 ROAS。
- 参考库是第三方原文（英文），中文输出；其中提到的脚本、命令和连接器未随包提供。
- **参考库只剩流程大纲**：原项目的各平台检查清单、评分规则、基准数据和打分程序都没有收录。用它时只列“这个平台要看哪些项目”和看到的问题，不给分数、等级或“健康度”，不声称做了完整体检；交付时写明“基于导出表的部分检查，不是完整体检”。其余按[共用约定第 11 节](../../cap-skill/references/shared-contracts.md#11-收录的第三方方法库怎么用)处理。

## 参考库

| 任务 | 参考 |
|---|---|
| 多平台广告检查（只列检查项目，不打分） | [ads-audit](library/claude-ads/ads-audit/guide.md) |
| Meta（Facebook、Instagram）广告 | [ads-meta](library/claude-ads/ads-meta/guide.md) |
| Google 广告 | [ads-google](library/claude-ads/ads-google/guide.md) |
| 亚马逊广告 | [ads-amazon](library/claude-ads/ads-amazon/guide.md) |
| YouTube 广告 | [ads-youtube](library/claude-ads/ads-youtube/guide.md) |
| Pinterest 广告 | [ads-pinterest](library/claude-ads/ads-pinterest/guide.md) |
| Snapchat 广告 | [ads-snapchat](library/claude-ads/ads-snapchat/guide.md) |
| Reddit 广告 | [ads-reddit](library/claude-ads/ads-reddit/guide.md) |
| TikTok 广告（第三方视角，与本模块官方 MCP 流程冲突时以本模块为准） | [ads-tiktok](library/claude-ads/ads-tiktok/guide.md) |
| 跨平台投放计划 | [ads-plan](library/claude-ads/ads-plan/guide.md) |
| 预算分配 | [ads-budget](library/claude-ads/ads-budget/guide.md) |
| 投放计算（CPA、ROAS、LTV 等口径核对） | [ads-math](library/claude-ads/ads-math/guide.md) |
| 广告素材诊断 | [ads-creative](library/claude-ads/ads-creative/guide.md) |
| 落地页诊断 | [ads-landing](library/claude-ads/ads-landing/guide.md) |
| 广告测试设计 | [ads-test](library/claude-ads/ads-test/guide.md) |
| 竞品广告分析 | [ads-competitor](library/claude-ads/ads-competitor/guide.md) |
| 投放前市场调研 | [ads-research](library/claude-ads/ads-research/guide.md) |
| 投放报告 | [ads-report](library/claude-ads/ads-report/guide.md) |
| 跨平台归因 | [ads-attribution](library/claude-ads/ads-attribution/guide.md) |

来源：[claude-ads](https://github.com/AgriciDaniel/claude-ads)（MIT），只收录 Markdown 正文，许可证见 `library/claude-ads/LICENSE`。
