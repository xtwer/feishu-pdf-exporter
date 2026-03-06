# 飞书知识库 PDF 批量导出工具

一个通用的自动化工具，用于批量导出飞书知识库中的文档为 PDF 格式。

## 特性

- 支持从知识库 URL 自动提取所有文档并导出
- 支持从 URL 列表文件批量导出
- 自动保存登录状态，无需重复登录
- 支持自定义配置（输出目录、延迟时间等）
- 提供浏览器控制台提取脚本（备用方案）

## 快速开始

### 1. 安装依赖

```bash
npm install
npm run install-browsers
```

### 2. 使用方法

#### 方法一：直接导出知识库（推荐）

```bash
npm start https://xxx.feishu.cn/wiki/xxxxxx
```

只需提供飞书知识库的 URL，工具会自动提取该知识库下的所有文档并导出为 PDF。

#### 方法二：从文件导出（更稳定）

1. 创建 `urls.txt` 文件，每行一个文档 URL：

```txt
# 文档1
https://xxx.feishu.cn/wiki/doc1

# 文档2
https://xxx.feishu.cn/wiki/doc2
```

2. 运行导出命令：

```bash
npm start urls.txt
```

或者直接运行（自动查找当前目录的 `urls.txt`）：

```bash
npm start
```

#### 方法三：使用浏览器控制台提取（备用）

如果自动提取失败，可以使用浏览器控制台脚本手动提取 URL：

1. 获取提取脚本：

```bash
npm run extract-script
```

2. 在飞书知识库页面按 F12 打开开发者工具
3. 切换到 Console（控制台）标签
4. 复制脚本并粘贴到控制台，按回车执行
5. 脚本会自动下载 `urls.txt` 文件
6. 将文件放到项目目录，然后运行 `npm start`

## 配置

编辑 [config.js](config.js) 文件来自定义配置：

```javascript
export default {
  // PDF输出目录
  outputDir: path.join(process.env.HOME, 'Desktop', 'feishu_exports'),

  // 是否无头模式（后台运行）
  headless: false,

  // 页面加载延迟（毫秒）
  delay: 3000,

  // 页面加载超时（毫秒）
  timeout: 60000,
};
```

## 登录流程

首次运行时：
1. 工具会自动打开浏览器
2. 如果需要登录，请在浏览器中完成登录（扫码或输入账号）
3. 登录状态会保存在 `browser-data` 目录
4. 下次运行时无需重新登录

## 输出结果

- 所有 PDF 文件保存在配置的输出目录（默认：桌面/feishu_exports）
- 文件名根据文档标题自动生成
- 支持中文文件名
- 导出完成后显示成功/失败统计

## 常见问题

### Q: 导出的 PDF 内容不完整？

A: 编辑 `config.js`，增加 `delay` 的值：

```javascript
delay: 5000  // 改为 5 秒或更长
```

### Q: 自动提取文档失败？

A: 飞书页面结构可能更新，建议使用方法二（从文件导出）或方法三（浏览器控制台提取）。

### Q: 登录失败或超时？

A: 删除 `browser-data` 目录，重新运行并手动登录：

```bash
rm -rf browser-data
npm start
```

### Q: 如何只导出特定的文档？

A: 创建一个 `urls.txt` 文件，只包含你想导出的文档 URL，然后运行 `npm start urls.txt`。

## 项目结构

```
feishu-pdf-exporter/
├── index.js              # 主入口脚本
├── config.js             # 配置文件
├── lib/
│   ├── exporter.js       # 核心导出模块
│   └── extractor.js      # URL提取模块
├── package.json          # 项目配置
├── browser-data/         # 浏览器数据（登录状态）
└── README.md            # 使用说明
```

## 命令参考

```bash
# 查看帮助
npm start -- --help

# 从知识库URL导出
npm start <知识库URL>

# 从文件导出
npm start <文件路径>

# 自动查找 urls.txt 并导出
npm start

# 生成浏览器提取脚本
npm run extract-script

# 安装浏览器驱动
npm run install-browsers
```

## 注意事项

1. 确保您的飞书账号有权限访问要导出的文档
2. 导出过程需要稳定的网络连接
3. 文档数量多时可能需要较长时间
4. 首次运行请设置 `headless: false` 以便登录

## 技术栈

- Node.js (>= 16)
- Playwright (浏览器自动化)
- 支持 macOS / Linux / Windows

## 许可证

MIT

## 更新日志

### v2.0.0

- 重构为通用工具，支持任意飞书知识库
- 支持命令行参数传入知识库 URL
- 模块化代码结构
- 更清晰的使用说明

### v1.0.0

- 初始版本
- 基础导出功能
