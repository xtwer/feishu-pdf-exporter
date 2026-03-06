# 快速开始指南

## 🚀 5分钟上手

### 1. 安装依赖

```bash
npm install
npm run install-browsers
```

### 2. 选择使用方式

#### 方式一：最简单 - 直接导出知识库

```bash
npm start https://xxx.feishu.cn/wiki/xxxxxx
```

把 `https://xxx.feishu.cn/wiki/xxxxxx` 替换为你的飞书知识库链接即可。

**首次使用提示：**
- 浏览器会自动打开
- 如果需要登录，在浏览器中扫码或输入账号登录
- 登录后工具会自动继续，无需其他操作
- 下次使用时不需要重新登录

---

#### 方式二：更稳定 - 从文件导出

**步骤 1：获取文档链接**

运行以下命令获取浏览器提取脚本：

```bash
npm run extract-script
```

**步骤 2：在浏览器中提取链接**

1. 在浏览器中打开你的飞书知识库页面
2. 按 `F12` 打开开发者工具
3. 切换到 `Console`（控制台）标签
4. 复制步骤1输出的脚本
5. 粘贴到控制台并按回车
6. 会自动下载一个 `urls.txt` 文件

**步骤 3：导出PDF**

把下载的 `urls.txt` 文件放到项目目录，然后运行：

```bash
npm start
```

---

## 📁 导出的PDF在哪里？

默认保存在桌面的 `feishu_exports` 文件夹。

## ⚙️ 自定义配置

编辑 [config.js](config.js) 文件：

```javascript
export default {
  // 修改输出目录
  outputDir: path.join(process.env.HOME, 'Desktop', 'my_pdfs'),

  // 如果PDF内容不完整，增加延迟时间
  delay: 5000,  // 单位：毫秒
};
```

## ❓ 常见问题

### PDF内容不完整？

编辑 `config.js`，增加 `delay` 值：

```javascript
delay: 5000  // 改为5秒或更长
```

### 自动提取失败？

使用方式二（从文件导出），更稳定。

### 需要重新登录？

删除 `browser-data` 文件夹，重新运行：

```bash
rm -rf browser-data
npm start
```

## 📚 更多信息

查看 [README.md](README.md) 获取完整文档。

## 💡 使用技巧

1. **批量导出多个知识库**：创建多个 `urls_*.txt` 文件，分别导出
2. **只导出部分文档**：手动编辑 `urls.txt`，只保留需要的URL
3. **定期备份**：使用 cron/定时任务定期运行导出脚本

---

**祝使用愉快！**
