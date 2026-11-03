---
name: cap-tiktok-ip-diagnostics
description: "诊断 IP 归属、ASN、风险评分、DNS、WebRTC、IPv6、Pixelscan、IPHey 和普通网页连通性，按内部阈值输出通过、待复核或不通过。"
---

# IP 检测诊断

## 工作方式

由课前准备入口发起（课前准备上下文）时，先读取 [课前准备流程控制契约](../cap-tiktok-prep/SKILL.md#流程控制契约全局硬规则)，继承当前步骤、状态和待返回位置。跳过、临时答疑、前置阻塞及结束条件按课前准备入口执行；缺少该依赖时不猜测控制规则、不继续顺序陪跑。模块内按现有 SOP 的独立结果建立固定节点编号，不能用“跳过”一次略过整套流程。

单独使用、没有课前上下文时，不套用课程 P 节点流程、跳过规则和结束祝词，只回答IP 检测与诊断；本模块以外的问题简短说明不在本模块范围，交回[总入口](../cap-skill/SKILL.md)。

用途仅限让网络环境稳定并与用户合法注册经营的市场一致；不协助绕过封禁或限制、多账号规避限制、伪造身份或规避平台审核。

读取 [references/ip-diagnostics.md](references/ip-diagnostics.md)，固定节点和 IP 后逐项检测。每个网站单独截图，AI 确认后再进行下一项。

## 关键标准

- Scamalytics：`0–10` 优质，`11–19` 合格，`20–29` 建议更换，`30+` 不交付。
- Country 必须与目标市场一致；City 允许同一国家内小范围数据库差异。
- ASN 优先 Mobile、Residential、Broadband、Cable、Fiber ISP。
- DNS 不要求全部属于目标国家，但禁止真实本地泄漏。
- WebRTC 为 Disabled 或只显示代理出口；出现真实公网 IP 不合格。
- IPv6 最佳为 Disabled/Not detected；存在时不得暴露真实网络。
- Pixelscan 重点排查 DNS Leak、WebRTC Leak、Blacklist、Location mismatch、IPv6 Leak、Hosting/Datacenter。
- IPHey 多项 Suspicious、Mismatch 或 Low Trust 时停止上号排查。

公网 IP 可作为比对证据，认证参数必须打码。IP 检测结果不保证 TikTok 账号、播放量或互动结果。
