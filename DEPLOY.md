# 部署指南 — PTE陪练

这个项目和你的"掼王练习生"用的是同一套 Cloudflare Workers 流程（Connect to Git + `npm run build` + `npx wrangler deploy`），只是这里用 D1（SQL 数据库）代替了 Durable Object，因为不需要实时对战。跟着下面的步骤走一遍，大概十几分钟能上线。

## 0. 本地准备

```bash
npm install
```

## 1. 创建 D1 数据库

```bash
npx wrangler login          # 第一次使用需要登录 Cloudflare 账号
npx wrangler d1 create pte_trainee
```

命令执行完会打印一个 `database_id`，把它填进 `wrangler.toml` 里 `[[d1_databases]]` 那一段，替换掉 `REPLACE_WITH_YOUR_D1_DATABASE_ID`。

## 2. 初始化表结构

```bash
npx wrangler d1 execute pte_trainee --remote --file=worker/migrations/0001_init.sql
```

## 3.（可选）导入你原来的 14 道题

`worker/migrations/0002_seed_questions.sql` 里已经打包好了你在 Claude Artifact 版本里添加的全部 14 道题（含中英对照、词汇表，`source` 标记为 `auto`）。因为题目需要挂在某个用户名下（`created_by` 字段），这一步要在你**第一次在新版 App 里注册账号之后**再做：

1. 先跳到第 6 步，把项目部署上线。
2. 用你想用的用户名注册一次（随便哪个用户名都行，就是这些题目会显示"由谁添加"用）。
3. 回到终端，把 `worker/migrations/0002_seed_questions.sql` 文件顶部的 `REPLACE_USERNAME` 替换成你刚注册的用户名（全文件里只出现一次这个占位符规律，可以用编辑器全部替换 `REPLACE_USERNAME` → 你的用户名）。
4. 执行：

```bash
npx wrangler d1 execute pte_trainee --remote --file=worker/migrations/0002_seed_questions.sql
```

这一步只需要做一次；题库是所有登录用户共享的，导入一次大家都能看到。

## 4. 本地开发（可选，用来先看看效果）

开两个终端：

```bash
# 终端 A：跑后端（含本地 D1 模拟）
npx wrangler dev --local --port 8787

# 终端 B：跑前端（带热更新，API 请求会自动转发到终端 A）
npm run dev
```

打开 `npm run dev` 打印的地址（一般是 `http://localhost:5173`）即可预览。这两个终端跑的是本地隔离的数据，不影响线上数据。

如果只是想验证"构建产物 + 后端"整体能不能跑起来，也可以只跑：

```bash
npm run build
npx wrangler dev --local --port 8787
```

然后直接打开 `http://localhost:8787`（这时前后端是同一个 Worker 提供的，和线上环境一致）。

## 5. 推送到 GitHub

新建一个 GitHub 仓库（比如 `pte-trainee`），把这个项目推上去：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:<你的用户名>/pte-trainee.git
git push -u origin main
```

## 6. 在 Cloudflare 里 Connect to Git

和掼王练习生一样的流程：

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Connect to Git**。
2. 选择刚才新建的仓库。
   - 如果列表里看不到这个仓库：去 `github.com/settings/installations` → 找到 **Cloudflare Workers and Pages** → **Configure** → **Repository access**，把这个仓库加进白名单（这是你在掼蛋项目里踩过的坑，这次同样适用）。
3. 构建配置：
   - **构建命令**：`npm run build`
   - **部署命令**：`npx wrangler deploy`
   - **Path**：仓库根目录 `/`
4. 部署环境变量：不需要额外配置，`wrangler.toml` 里已经声明了 D1 绑定和静态资源目录。
5. 保存后会自动触发第一次构建部署。之后每次 push 到 `main` 分支都会自动重新构建部署。

## 7. 绑定自定义域名

原始的 `*.workers.dev` 地址在国内网络环境下可能被墙（和掼蛋项目里的情况一样），所以要绑定 `pte.junowren.com`：

1. Cloudflare 控制台 → **Workers & Pages** → 找到刚部署的 `pte-trainee` → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**。
2. 填 `pte.junowren.com`，Cloudflare 会自动在同账号下的 `junowren.com` 里加一条 DNS 记录（因为域名已经在 Cloudflare Registrar 托管，这一步基本是全自动的）。
3. 等 DNS 生效（通常几分钟内），用 `https://pte.junowren.com` 打开即可。

## 8. 分享给别人用

把 `https://pte.junowren.com` 发给任何人，对方直接在手机浏览器打开、自己注册一个用户名密码就能用——不需要 Claude 账号，也不需要你邀请。iOS/Android 浏览器打开后可以用"添加到主屏幕"，图标和名字会显示为"PTE陪练"，体验上和原生 App 差不多（这是标准 PWA 的能力）。

题库是所有注册用户共享的（谁都能往里加新题），但每个人自己的学习进度、错题、词汇复习记录、模拟测试历史，都是各自独立、互不可见的。

## 日常维护

- 之后再往题库里加题，可以直接在 App 里用右下角的"+"手动添加，不需要再跑数据库脚本了。
- 如果以后想改前端样式、加新功能，改代码后 `git push` 到 `main` 分支就会自动重新部署，和掼蛋项目的体验一致。
- 想查看/修改线上数据库里的内容，可以用 `npx wrangler d1 execute pte_trainee --remote --command "SELECT ..."`。
