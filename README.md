# PTE陪练

PTE 备考小工具：题库练习（原文+中文翻译+发音跟读）、模拟测试、错题本、基于记忆曲线的词汇复习。是原先 Claude Artifact 版本的独立重制版——不再依赖 Claude 账号，任何人用手机浏览器打开链接、自己注册用户名密码即可使用，可"添加到主屏幕"当作 App 用。

- 前端：React 19 + Vite + Tailwind 4，PWA
- 后端：Cloudflare Worker + D1（SQL 数据库），Hono 路由
- 认证：用户名 + 密码（PBKDF2 哈希），不采集手机号/邮箱
- 数据模型：题库（`questions`）所有用户共享；每个人的学习进度、词汇复习记录、模拟测试历史各自独立

部署步骤见 [DEPLOY.md](./DEPLOY.md)。

## 本地开发

```bash
npm install
npx wrangler d1 execute pte_trainee --local --file=worker/migrations/0001_init.sql
npx wrangler dev --local --port 8787   # 终端 A：后端
npm run dev                            # 终端 B：前端（http://localhost:5173）
```

## 目录结构

```
worker/               Cloudflare Worker 后端（Hono 路由 + D1）
  index.ts             API 路由
  auth.ts              密码哈希 / token 工具
  migrations/          D1 schema 及题库导入脚本
src/                  React 前端
  components/          各页面组件
  hooks/               数据加载与全局状态
  lib/                 API 封装、记忆曲线算法、语音朗读、类型定义
public/               PWA manifest、图标、service worker
wrangler.toml         Cloudflare Worker 配置（D1 绑定、静态资源目录）
```
