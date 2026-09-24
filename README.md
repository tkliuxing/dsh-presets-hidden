# dsh-presets-hidden

[English README](README.en.md)

DeepSeek Harness 的浏览器端预设显示与排序插件。它在“设置 -> 预设显示”中提供搜索、显隐筛选、逐项开关和顺序调整，并用处理后的名单替换新会话页的 Agent 预设选择器。

> **兼容性**：`0.2.x` 需要 deepseek-harness `0.1.7-rc.1` 及以上（`engines.dsh: >=0.1.7-rc.1`）。DSH `0.1.5` 及更早版本请使用本插件 `0.1.x`。

## 行为边界

- 内置预设和自定义预设都可以隐藏和调整顺序。
- 在 loopback 页面上，显隐名单与排序作为插件 Config 的 volatile 字段写入当前 profile 的 `cordis.patch.yml`（条目 id `preset-visibility`），修改即时生效且按 profile 独立保存；非 loopback 页面仍使用当前浏览器的 `localStorage`，键名为 `dsh.presets-hidden.visibility.v1`。
- 旧数据自动迁移（仅在 profile 尚未保存这两个字段时进行一次）：DSH 0.1.7 把 `$DSH_HOME/settings.yaml` 重命名为 `settings.yaml.imported` 后，插件会把其中的 `preset-visibility` 段导入当前 profile；旧版 `localStorage` 数据也会在首次打开 loopback 页面时迁移。
- 与官方选择器一致：当“Agent 预设 → 新任务可选择模式”关闭或开发者工具关闭时，新会话页不显示预设控件，使用 Host 默认预设；设置页会给出提示。
- 上移和下移针对完整名单；搜索或显隐筛选生效时，排序按钮会禁用，避免跨越不可见项产生歧义。
- 新出现的自定义预设自动追加到现有顺序末尾；“恢复默认顺序”回到 Host roster 顺序。
- 只处理新会话页的预设选择器；官方“Agent 预设”管理页、会话标题、旧会话恢复、直接 API 调用和插件诊断仍使用完整名单。
- 隐藏当前空白会话所选预设时，插件会通过官方选择 API 切换到首个可见预设。
- 隐藏全部预设时，新会话页不显示预设控件，Host 默认预设仍然生效。

## 安装

发布到 npm 后，可通过 DSH 插件机制直接安装：

```sh
dsh plugin --profile web add dsh-presets-hidden
```

## 开发

构建并测试：

```sh
pnpm install
pnpm run check
```

若希望使用本机 DSH 源码 checkout 进行开发，可在 `.npmrc` 或 `package.json` 的 `pnpm.overrides` 中把相关 `@deepseek-ai/*` 依赖指向本地路径，替代默认的 registry 版本。

## 安装到 Web profile（本地 bundle）

先构建，再将当前目录作为本地 bundle 安装：

```sh
pnpm run build
dsh plugin --profile web add /Users/baihaoran/Code/github.com/tkliuxing/dsh-presets-hidden
```

从 DSH 源码 checkout 使用 CLI 时，将第二条命令改为：

```sh
pnpm dsh plugin --profile web add /Users/baihaoran/Code/github.com/tkliuxing/dsh-presets-hidden
```

## 发布

- CI：`.github/workflows/ci.yml` 会在 push/PR 时执行 `pnpm run check`。
- Release：在 GitHub 上发布 Release 后，`.github/workflows/release.yml` 会自动构建、测试并发布到 npm（带 provenance）。npm 侧已配置 **Trusted Publisher**，GitHub 侧无需设置 `NPM_TOKEN`，但 workflow 必须使用 `npm-publish` environment 并开启 `id-token: write` 权限。

插件包声明了 `dsh.bundle` 和 `dsh.client`。Host 入口导出带 volatile 字段的 `Config`，DSH 的 settings 服务据此提供 `preset-visibility` 表单（插件页的自动表单已关闭，编辑入口在“设置 → 预设显示”）。
