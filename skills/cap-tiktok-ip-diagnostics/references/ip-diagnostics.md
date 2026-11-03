# IP 检测与 TikTok 现象诊断

## IP 购买

询价话术和 Miya、IPRoyal、911Proxy 下单步骤见 [IP 购买规格](../../cap-tiktok-ip-purchase/references/purchase-specifications.md)；本文件只负责检测与诊断。

## 检测方法

建议维护一个“测试网站清单”，按四组记录，不依赖单一网站：

1. **出口一致性**：IPv4/IPv6、地理位置、ASN/组织、代理/VPN 标记。
2. **基础连通性**：普通网页、DNS 解析、HTTPS、下载小文件。
3. **质量**：延迟、丢包、抖动、连续多次结果。
4. **应用对照**：TikTok 能否登录、浏览、搜索、发布草稿；记录官方错误提示。

每项记录时间、设备、网络、客户端、节点/IP 标签。用户发截图前打码账号和配置凭据。把多个网站互相矛盾的结果标成“冲突”，不要擅自选一个当真相。

## IP 检测操作顺序

学员完成 Shadowrocket 连接后，先固定当前节点和代理状态，再按下面顺序检测。每一步只打开一个网站，完成后截图，AI 确认后继续。

### 第 0 步：记录测试条件

先记录：

```text
检测日期和时间：
手机型号与 iOS 版本：
Wi-Fi 或移动网络：
Shadowrocket 当前节点/代理名称：
是否已连接：
购买的国家/地区、城市、类型、ASN：
```

不要在记录中写入完整订阅链接、密码、UUID 或代理认证信息。

### 第 1 步：查 IP 归属、位置和 ASN

先打开 IP 归属类网站，例如 `IP2Location`、`IP.SB`、`DB-IP` 或服务商指定的 IP 检测页，确认：

- 当前公网 IPv4/IPv6；
- 国家/地区；
- 州、省或城市；
- ASN；
- ISP/组织名称；
- 是否被标记为 VPN、Proxy、Hosting 或 Datacenter。

合格的基础条件：

- 实际出口国家/地区与购买目标一致；
- `City` 允许同一国家内存在小范围数据库差异；差异较大时标记为待复核；
- ASN 优先为 `Mobile`、`Residential`、`Broadband`、`Cable` 或 `Fiber ISP`；
- 避免 `Hosting`、`Datacenter`、`Cloud` 或 `VPS` ASN；
- 没有出现明显的数据中心归属，除非购买的就是数据中心产品；
- IPv4/IPv6 没有出现与目标地区冲突的出口。

### 第 2 步：查 IP 风险评分

打开 `Scamalytics`，输入当前出口 IP，记录页面中的风险分数、风险等级、代理类型和组织信息。

判断规则：

- `0–10`：优质，进入下一步；
- `11–19`：合格，结合其他检测结果判断；
- `20–29`：建议更换，暂不用于后续账号操作；
- `30` 及以上：不交付，停止使用并联系服务商或工作人员。

Scamalytics 只是其中一项证据。不要为了改变分数反复切换 IP，也不要把单一网站结果当成 TikTok 账号结果的保证。

### 第 3 步：查 DNS 和 WebRTC 泄漏

打开 `IPLeak`、`DNSLeakTest` 或服务商指定检测页，分别检查：

- DNS 服务器所在国家/地区；
- DNS 运营商；
- WebRTC 是否暴露本地公网地址；
- IPv4 和 IPv6 是否出现多个不一致出口。

合格的基础条件：

- DNS 不要求全部属于目标国家；
- 但禁止出现真实本地 ISP 或真实地区 DNS 泄漏；
- WebRTC 为 `Disabled`，或只显示代理出口 IP，视为合格；
- WebRTC 出现真实公网 IP，视为不合格；
- IPv6 最佳状态为 `Disabled` 或 `Not detected`；
- 如果存在 IPv6，必须与代理出口网络一致，禁止暴露真实网络。

如果出现泄漏，先记录结果并暂停后续 TikTok 测试，不要同时修改多个设置。

### 第 4 步：查浏览器环境与指纹一致性

按需要打开 `Pixelscan`、`IPHey`、`BrowserLeaks`、`CreepJS` 或 `Cover Your Tracks`，检查：

- IP 与浏览器时区、语言、地区是否明显冲突；
- WebRTC、Canvas、字体、屏幕和系统信息是否出现异常；
- 浏览器是否显示代理、自动化或高风险环境提示。

这一组结果只能作为辅助证据。浏览器检测页的“通过”不等于 TikTok 一定正常，出现异常也不一定单独证明 IP 不可用。

重点排查：

- `DNS Leak`
- `WebRTC Leak`
- `Blacklist`
- `Location mismatch`
- `IPv6 Leak`
- `Hosting/Datacenter`

在 `IPHey` 中，`IP`、`Location`、`Timezone`、`Browser`、`Hardware`、`Software` 应整体保持一致。出现多项 `Suspicious`、`Mismatch` 或 `Low Trust` 时，先停止后续账号操作，回到设备、代理和 IP 一致性排查。

### 第 5 步：做普通网页连通性测试

保持同一个节点和同一个 IP，依次测试：

1. 一个普通 HTTPS 网页；
2. Google 或课程要求的网页；
3. 一个小文件或图片加载；
4. 必要时连续两到三次刷新，观察是否超时。

记录打开时间、是否超时、是否卡顿和是否需要反复刷新。不要在这一步同时切换节点、重启手机和修改 DNS。

### 第 6 步：汇总并分级

将结果归入以下三类：

- **通过**：Scamalytics 为 `0–19`，国家一致，ASN 类型符合要求，DNS 无真实本地泄漏，WebRTC/IPv6 无真实网络暴露，Pixelscan/IPHey 无关键冲突，网页连通性稳定；
- **待复核**：只有一个检测网站异常，或城市、ASN、风险标签存在冲突，需要补测或咨询服务商；
- **不通过**：Scamalytics `20` 及以上，国家明显不符，出现真实本地 DNS/WebRTC/IPv6 泄漏，Pixelscan 出现关键泄漏或位置冲突，IPHey 多项不可信，无法稳定访问普通网页，或购买规格与实际类型明显不一致。

AI 输出时必须说明：哪一项证据导致当前等级、还缺什么证据、下一步只做什么。

## 学员截图提交顺序

不要一次发送一整屏大量截图。按以下顺序逐张提交：

1. Shadowrocket 已连接首页；
2. IP 归属和 ASN 页面；
3. Scamalytics 风险页面；
4. DNS/WebRTC 页面；
5. Pixelscan 或 IPHey 页面；
6. 普通网页访问结果；
7. 需要时补充服务商订单规格页面。

截图前遮住代理账号、端口、用户名、密码、订阅链接、二维码、UUID、邮箱和订单支付信息。公网 IP 本身是检测对象，可以保留给 AI 用于比对，但不要连同认证参数一起发送。

## 当前内部检测清单

以下网站来自内部 IP 配置 SOP。快速判断不要求全部打开；进入深度诊断时，按类别分组检测。

### IP 欺诈评分与风控检测

- Scamalytics：`https://scamalytics.com`
- IPQualityScore：`https://www.ipqualityscore.com`
- IP2Location / IP2Proxy：`https://ip2location.com` / `https://ip2proxy.com`
- MaxMind：`https://www.maxmind.com`
- IP 评分：`https://ip-score.com`

### 浏览器指纹与环境检测

- BrowserLeaks：`https://browserleaks.com`
- Pixelscan：`https://pixelscan.net`
- IPHey：`https://iphey.com`
- f.vision：`https://f.vision`
- CreepJS：`https://abrahamjuliot.github.io/creepjs`
- Cover Your Tracks：`https://coveryourtracks.eff.org`

### DNS 泄漏与 WebRTC 检测

- IPLeak：`https://ipleak.net`
- DNSLeakTest：`https://dnsleaktest.com`
- Test-IPv6：`https://test-ipv6.com`

### 综合 IP、ASN 与归属检测

- MyIP / IP 检查：`https://ip.check.place` / `https://myip.com`
- IP.SB：`https://ip.sb`
- CIP.cc：`https://cip.cc`
- BGP.he.net：`https://bgp.he.net`
- DB-IP：`https://db-ip.com`

这些网站的结果只能作为诊断证据，不能单独证明“适合 TikTok”或保证账号、播放和互动结果。AI 需要结合购买规格、多个检测结果、设备状态和 TikTok 的实际提示判断。

## 现象分流

### 连不上网

先做普通网页和 DNS 测试，再检查客户端权限、模式、配置到期、节点状态和 IPv4/IPv6。不能仅凭 TikTok 打不开判断 IP 坏了。

### 能上网但卡

比较直连/中转、不同时间段和同一网站的延迟/丢包。卡顿可能来自 Wi-Fi、移动网络、DNS、链路拥塞、节点负载或应用自身，先证据化再换 IP。

### 0 播放

先确认作品是否公开、是否仍在处理、是否有“不可推荐/不符合资格”等官方提示、账号是否有违规记录，以及其他公开内容是否同样异常。不要提供刷量、批量测试、规避审核或伪造地区的方案。

### 不能点赞/关注/收藏

区分按钮无响应、报错、短暂限制和账号整体受限。保存 TikTok 原文提示，检查账号状态和应用版本；若平台提示限制，走官方申诉/支持流程。

### 不能换头像

检查图片格式、尺寸、应用权限、网络请求是否完成和 TikTok 原文提示。不要把头像上传失败直接归因于 IP，也不要建议反复切换地区或设备来规避限制。

## 结论标签

只使用以下标签：`客户端配置`、`节点/中转质量`、`IP 信息不一致`、`本地网络/设备`、`账号状态`、`内容/推荐资格`、`平台服务异常`、`证据不足`。每个结论附证据和下一步，不做“保证解封/保证播放”的承诺。
