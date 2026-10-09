# guangao-theme

Monitor 公开状态页主题：整页呈现夸张、密集的广告墙视觉，实际展示服务器探针信息。

## 当前状态

已完成 v0.1.0：三种广告墙样式、节点分组、资源指标、费用与到期信息、历史资源曲线和延迟曲线。已安装在独立的预览 Hub 上。

![红黄促销墙预览](docs/previews/promo.png)

截图使用明确标识的开发演示数据，不代表真实服务器。[紫绿版](docs/previews/neon.png)、[复古版](docs/previews/retro.png)、[手机布局](docs/previews/mobile.png)。

## 本地开发

需要 Node.js 24.11+，依赖版本由 package-lock.json 固定。

```sh
npm ci
npm run dev:demo
```

访问 http://127.0.0.1:5173。页脚可切换三种皮肤、停止动效；这些访客偏好仅影响当前浏览器。开发演示接口仅在 `dev:demo` 中启用，不会进入正式构建。

使用真实 Hub 数据时，先在另一个终端建立隧道，再运行普通开发服务器：

```sh
ssh -N -L 127.0.0.1:9911:127.0.0.1:9911 example-host
npm run dev
```

Vite 默认代理 `/api` 和 WebSocket 到 http://127.0.0.1:9911，也支持 `MONITOR_HUB` 环境变量指定其他公开 Hub。

## 构建与安装

```sh
npm test
npm run lint
npm run build
npm run package
```

在 Monitor 后台的主题页上传 `theme.tar.gz`，选择「广告墙 · Guangao」即可，无需重启。主题目录也可放入 Hub 的 `--themes` 目录。

仓库当前为私有，Hub 无法通过公开 GitHub 下载接口直接安装或自动更新它；私有阶段使用本地主题包上传。后台主题设置控制站点配色、公告、标题、汇总、浮窗和动效，值由 Hub 保存。

主题使用 `/node/{id}` 详情路由，反向代理或 WAF 如有路径白名单，须放行它以及 `/favicon.svg` 和 `/apple-touch-icon.png`。后台 `/admin/*`、API 和 agent 路由由 Hub 处理。

## 验证

```sh
npx playwright install chromium
npm run test:e2e
```

测试覆盖压缩与文本 WebSocket 更新、分组、配置默认值、离线/未上报/真实零速、异常数据、HTML 错误回复、详情刷新和浏览器前进后退、手机布局、减少动态效果和文本转义。

开发截图可用 `node scripts/capture.mjs` 更新，需要演示服务器正在 5173 端口运行。该脚本同时生成 `preview.png` 和不透明的 180×180 Apple 图标。

## 设计方向

- 红黄促销墙：撞色横幅、描边大字、爆炸贴纸。
- 紫绿广告墙：渐变、立体字、发光边框。
- 复古 GIF 广告墙：像素边框、低帧率灯牌。
- 广告卡片展示真实节点指标，按钮进入节点详情；不包含真实广告。
- 手机支持单列布局，动效支持减少动态效果。

## 开发依据

必须遵循 [Monitor 官方主题开发指南](https://monitor-document.pages.dev/dev/theme)，并参考 [官方默认主题](https://github.com/monitor-probe/monitor-theme-default)。

主题短名约定为 `guangao-theme`，目录与 `theme.json` 中的 `short` 保持一致。主题是纯静态 SPA，仅使用官方规定的同源接口；后台与登录页由 Hub 提供。

最终安装包为 `theme.tar.gz`，包含 `guangao-theme/theme.json`、可选的 `preview.png` 和 `dist/index.html`。站点设置在 `theme.json.config` 中声明并由 Hub 保存；实时数据、缺失字段、错误处理、历史范围、分组、图标及路由均遵循指南。

## 部署边界

Hub 已独立部署在 example-host，仅监听 `127.0.0.1:9911`，通过 SSH 隧道访问。使用 `/opt/monitor-theme-hub` 独立目录、`monitor-theme-hub` 服务账户、数据库和主题目录，内存上限 256 MB。

正式 Hub 当前没有接入节点，页面如实显示空状态。部署未修改、重启或迁移 VPS 上已有的 monitor-agent、komari-agent，也未改变其上报目标。

`node scripts/bootstrap-hub.mjs <ssh别名>` 仅用于新建部署，遇到已有目录或服务会退出。`node scripts/deploy-theme.mjs <ssh别名>` 上传主题并检查现有 agent 的文件哈希、PID 和重启次数。辅助脚本只面向这台已检查的 VPS，Hub 管理凭据保存在被 Git 忽略的 `.cache/hub-access.txt`；不会写入源码或命令参数。

本仓库不得提交服务器凭据、agent token、环境文件或数据库。演示数据须明确标识并与正式数据隔离。

## 许可与参考来源

MIT，见 LICENSE。官方参考实现的版权声明保留在 LICENSE，来源版本和改动边界见 THIRD_PARTY.md。
