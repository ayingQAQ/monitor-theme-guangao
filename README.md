# guangao-theme

Monitor 公开状态页主题：整页呈现夸张、密集的广告墙视觉，实际展示服务器探针信息。

## 当前状态

项目初始化阶段，尚未实现主题或部署 Hub。

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

Hub 计划独立部署在 example-host，仅监听回环地址，通过 SSH 隧道预览。使用独立目录、服务账户、数据库和主题目录；不得修改、重启或迁移 VPS 上已有的 monitor-agent、komari-agent，也不得改变其上报目标。

本仓库不得提交服务器凭据、agent token、环境文件或数据库。演示数据须明确标识并与正式数据隔离。
