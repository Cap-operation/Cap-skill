# 官方来源与核验边界

核对日期：2026-10-31。以下是当前资料入口，不是静态工具或参数目录。实际执行时以当前官方文档、当前账户权限、已发现工具 schema 和平台返回结果联合核验；页面不可读就报告缺口，不声称已读到内容。

本模块为本系统候选执行说明，不是 TikTok 官方 Skill 认证；没有复制 Creatiads 或其他第三方 Skill 源码。官方 MCP 的存在不能单独证明每条广告、素材、数据处理或当地业务都合规。

## MCP 与客户端

| 官方资料 | 用途 |
|---|---|
| [About TikTok for Business MCP Server](https://ads.tiktok.com/resources/help/article/about-tiktok-for-business-mcp-server?lang=en-GB&redirected=2) | 官方服务身份、广告管理 / 报表能力、layer 与 flat 地址及加载方式 |
| [How to connect ChatGPT to TikTok for Business MCP Server](https://business-api.tiktok.com/portal/docs/how-to-connect-chatgpt-to-tiktok-for-business-mcp-server/v1.3) | 官方连接、30 天用户授权窗口及同一 Upgraded Smart+ Ad 的写入间隔；客户端配置不能跨产品照搬 |
| [Available tools in TikTok for Business MCP Server](https://business-api.tiktok.com/portal/docs/available-tools-in-tiktok-for-business-mcp-server/v1.3) | 工具能力入口；具体调用仍依实时发现和 schema |
| [MCP Authorization](https://business-api.tiktok.com/portal/docs/mcp-authorization/v1.3) | 用户授权、有效期、撤销与重新授权；区别于 token 刷新 |
| [Codex MCP documentation](https://developers.openai.com/codex/mcp) | Codex 客户端 MCP 配置、HTTP 服务与 OAuth 支持；命令选项再核对本机帮助 |

上述官方连接说明的 Note 明确列出 `smart_plus_ad_create`、`smart_plus_ad_update`、`smart_plus_ad_status_update` 对同一个 Upgraded Smart+ Ad 每 5 秒最多 1 次的限制；这里只用于识别限流范围，实际调用仍先发现对应工具和 schema，不能将该值泛化为所有 MCP 工具的统一 QPS。实际更严格的约束优先。

官方服务地址：

```text
https://business-api.tiktok.com/open_mcp/tt-ads-mcp-layer
https://business-api.tiktok.com/open_mcp/tt-ads-mcp-flat
```

文档中的约 40 / 400 个工具是加载策略说明，不是固定数量或任何账户的功能保证。连接账户后仍须核对角色、业务授权及所需产品能力。

## GMV Max 与报表

| 官方资料 | 本模块使用的核对点 |
|---|---|
| [Create a GMV Max campaign](https://business-api.tiktok.com/portal/docs/create-a-gmv-max-campaign/v1.3) | Product / LIVE 的资格、启用状态、排期、自动增额 / 促销日、请求去重有效期等；不把示例视为全部账户保证 |
| [Data latency for reports](https://business-api.tiktok.com/portal/docs/data-latency-for-reports/v1.3) | 各报表数据成熟度；GMV Max 当前可能最多延迟约 24 小时 |
| [How to evaluate the performance of Product GMV Max](https://ads.tiktok.com/resources/help/article/how-to-evaluate-the-performance-of-product-gmv-max?lang=en) | Product GMV Max 整体 ROI、自然等流量贡献与效果口径 |
| [Best practices for Product GMV Max](https://ads.tiktok.com/resources/help/article/best-practices-for-product-gmv-max?lang=en) | 避免频繁修改 ROI、使用有意义观察窗口；按适用条件解释 |
| [How to view reporting for your Product GMV Max campaign](https://ads.tiktok.com/help/article/how-to-view-reporting-for-your-product-gmv-max-campaign) | 产品报告入口和指标；与普通广告报表分列 |

GMV Max API 文档中的字段只作核对提示。不能把 API HTTP 路径直接当 MCP 工具名，也不能在未发现当前工具时自行构造 HTTP 客户端发起写入。

## 广告政策与数据

- [Advertising on TikTok: first things to note](https://ads.tiktok.com/resources/help/article/advertising-on-tiktok-first-things-to-note)：广告主责任、广告与业务的基本规则；具体市场、商品、素材及投放限制继续查看相应官方政策。
- [TikTok Advertiser Tools and related terms](https://ads.tiktok.com/resources/help/article/tiktok-advertiser-tools-and-related-terms)：广告数据工具与相关条款入口。涉及客户名单、Pixel、订单或个人数据时核对适用授权、隐私要求和当地规则。
- [TikTok Business Help Center](https://ads.tiktok.com/help/)：当前产品、账户、政策与功能变动的官方检索入口。

不以“官方 MCP”“AI 自动化”或“账户能调到接口”替代广告审查、素材广告权、店铺资格或数据合法使用判断。需要作法律适用判断而资料不足时标明缺口，不给笼统的全球合规保证。

## 内部方法和事实分开

- 课程方法：`../../cap-tiktok-shop/references/paid-growth.md` 中的投放前置、利润和履约判断；不得包装成平台统一最低条件。
- 行为约定：本模块的默认草案、执行批准和恢复流程；Skill 不能提供程序级强制。
- 本次建议：基于当前账户数据、商业目标和可验证假设；不得永久写回课程或承诺效果。
- 实际执行：以平台返回与回读证据报告；未执行的建议不能写成结果。

来源冲突时先确认产品、版本、市场、账户和时间差异；无法解释则停止受影响写入，说明需要核对的具体事实。不能为完成任务而沿用已证实失效的参数或规则。
