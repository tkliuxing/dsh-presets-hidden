# dsh-presets-hidden

DeepSeek Harness 的浏览器端预设显示与排序插件。它在“设置 -> 预设显示”中提供搜索、显隐筛选、逐项开关和顺序调整，并用处理后的名单替换新会话页的 Agent 预设选择器。

## 行为边界

- 内置预设和自定义预设都可以隐藏和调整顺序。
- 在 loopback 页面上，显隐名单与排序持久化到 `$DSH_HOME/settings.yaml` 的 `preset-visibility` 段；非 loopback 页面仍使用当前浏览器的 `localStorage`，键名为 `dsh.presets-hidden.visibility.v1`。
- 首次在 loopback 页面上启动且 Host 段为空时，插件会自动把旧版 `localStorage` 数据迁移到 `settings.yaml`。
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

插件包声明了 `dsh.bundle` 和 `dsh.client`。Host 入口注册 `preset-visibility` 设置命名空间，使 loopback 页面上的偏好能够持久化到 `$DSH_HOME/settings.yaml`。
