# 卡牌收集

管理你的小卡收藏，标记已拥有/未拥有，导出图片。

## 功能

- **收集卡牌**：上传卡牌图片，框选测量卡片尺寸，自动识别行列网格，标记已拥有/未拥有，导出未拥有的卡
- **制作图鉴**：创建相册，上传图片并添加脚注，可自定义每行数量，导出为长图

## 技术栈

- Vue 3 + Vite + Pinia + Vue Router
- IndexedDB 本地存储（数据存浏览器，刷新不丢）
- Cloudflare Pages 部署

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 数据

所有数据存储在浏览器 IndexedDB 中，清除浏览器数据会导致收藏丢失。
