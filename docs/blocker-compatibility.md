# 广告过滤兼容性检查

## 风险与处理

手机截图保留了页头、网速浮条和页脚，缺失的节点列表、汇总与详情都位于原 `.ad-main` 中。公开的 [280blocker 规则](https://github.com/bestpika/280blocker/blob/master/280blocker_adblock.txt) 包含 `##[class^="ad-main"]`，可直接隐藏该区域；测试已在修改前复现隐藏故障。用户使用 Via，但未取得该手机实际订阅列表，因此不能认定具体启用了哪条规则。

| 原 DOM 类名 | 新名称 | 用途 |
| --- | --- | --- |
| ad-app | monitor-app | 主题根区域、皮肤与动效状态 |
| ad-main | monitor-main | 主内容 |
| ad-grid | node-grid | 节点列表 |
| node-ad | node-card | 节点卡片 |
| node-ad-border-animate | node-border-light | 边框灯 |
| hero-ad | overview-panel | 节点汇总 |
| detail-ad | node-detail | 节点详情 |
| ad-resource | resource-tile | CPU、内存、磁盘指标 |

除已证实的 ad-main 外，其余广告语义类名属于通用前缀、后缀或自定义元素隐藏规则的潜在匹配目标，统一改成实际内容语义。JSX、CSS、现有测试和截图脚本同步修改，CSS 声明值保持原样；卡片比例、字体、三种皮肤、动画及交互均保留。

## 资源与标识

开发模式会直接请求源模块，因此 `adwall.css` 和 `AdCard.tsx` 分别改名为 `monitor-wall.css` 和 `MonitorCard.tsx`。生产构建将它们合并为 `/assets/index-*.css` 和 `/assets/index-*.js`，本身不使用上述源码文件名发起请求。国旗 SVG 为国家代码与内容 hash 命名。页面图标使用 `/favicon.svg`、`/apple-touch-icon.png`，数据接口使用 Monitor 的 `/api/*` 及 WebSocket，同源访问，无广告或追踪服务请求。

`theme.json.short` 继续为 `monitor-theme-guangao`，已有升级地址、配置接口、localStorage 偏好键、`root` / `main` / `nodes` ID 不变。`admin`、`load`、`download`、`shadow` 等正常词汇不按字符包含 ad 替换。广告墙视觉文案继续保留；`bottom-banner` 仅为页内静态视觉装饰，没有广告 URL，未机械改名。

## 验证范围

`tests/blocker.spec.ts` 将代表性元素隐藏选择器注入页面，覆盖主内容前缀、广告前缀、节点卡片、广告后缀及 ID 规则。三种皮肤均检查手机主区域、每张卡片及资源数字实际可见，检查边框灯与动效开关、详情跳转与重载、历史图，以及桌面主区域与汇总。

这项验证模拟 CSS 元素隐藏，不等于在 Via、AdGuard 或 uBlock Origin 的所有版本和所有订阅列表上实机验证；用户自定义针对本站的规则仍可能隐藏任何元素。

## 剩余价值计算器

计算器使用中性的 value-trigger、value-calculator、calc-field 等类名。仅打开计算器并选择外币时请求 api.frankfurter.dev/v2/rate/{currency}/cny，不发送节点或表单内容。请求失败可手动输入汇率；人民币与本地 PNG、Markdown 导出无需外部请求。没有新增广告或追踪服务。
