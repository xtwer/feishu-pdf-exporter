#!/usr/bin/env node

import { FeishuExporter } from './lib/exporter.js';
import { getUrlSource, readUrlsFromFile, generateExtractScript } from './lib/extractor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载配置
let config = {};
const configPath = path.join(__dirname, 'config.js');
if (fs.existsSync(configPath)) {
  const configModule = await import(configPath);
  config = configModule.default || configModule;
}

// 打印使用说明
function printUsage() {
  console.log(`
飞书知识库PDF导出工具
======================

使用方法：

  1. 导出单个知识库（自动提取所有文档）:
     npm start <知识库URL>

     示例:
     npm start https://xxx.feishu.cn/wiki/xxxxxx

  2. 从文件导出（推荐，更稳定）:
     npm start urls.txt

     或者直接运行（自动查找当前目录的 urls.txt）:
     npm start

  3. 生成浏览器提取脚本:
     npm run extract-script

配置：
  可以编辑 config.js 文件来自定义输出目录、延迟等参数

提示：
  - 首次运行需要在浏览器中登录飞书账号
  - 如果自动提取失败，请使用浏览器控制台脚本手动提取URL
  - 导出的PDF文件保存在桌面的 feishu_exports 文件夹
`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  // 特殊命令
  if (args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--extract-script')) {
    console.log('\n=== 浏览器控制台提取脚本 ===\n');
    console.log('复制以下代码，在飞书知识库页面的浏览器控制台（F12）中运行：\n');
    console.log(generateExtractScript());
    console.log('\n=================================\n');
    process.exit(0);
  }

  console.log('='.repeat(60));
  console.log('飞书知识库 PDF 批量导出工具');
  console.log('='.repeat(60));
  console.log();

  // 获取URL来源
  let source;
  try {
    source = getUrlSource(args);
  } catch (error) {
    console.error(`错误: ${error.message}\n`);
    printUsage();
    process.exit(1);
  }

  // 创建导出器实例
  const exporter = new FeishuExporter(config);
  await exporter.init();

  let result;

  try {
    if (source.type === 'url') {
      // 从知识库URL自动提取并导出
      console.log(`模式: 自动提取知识库文档`);
      console.log(`知识库: ${source.value}\n`);
      result = await exporter.exportFromWiki(source.value);
    } else if (source.type === 'file') {
      // 从文件读取URL列表导出
      console.log(`模式: 从文件读取URL列表`);
      console.log(`文件: ${source.value}\n`);

      const urls = readUrlsFromFile(source.value);
      if (!urls || urls.length === 0) {
        throw new Error(`文件中没有找到有效的飞书文档URL`);
      }

      console.log(`找到 ${urls.length} 个文档URL\n`);
      result = await exporter.exportFromUrls(urls);
    } else {
      console.log('未找到 urls.txt 文件，也未指定知识库URL\n');
      console.log('请选择以下方式之一：\n');
      console.log('1. 创建 urls.txt 文件（每行一个文档URL）');
      console.log('2. 运行: npm start <知识库URL>');
      console.log('3. 使用浏览器控制台脚本提取URL: npm run extract-script\n');
      printUsage();
      await exporter.close();
      process.exit(1);
    }

    // 打印结果
    console.log('\n' + '='.repeat(60));
    console.log('导出完成！');
    console.log('='.repeat(60));
    console.log(`✓ 成功: ${result.successCount} 个文档`);
    console.log(`✗ 失败: ${result.failCount} 个文档`);
    console.log(`总计: ${result.total} 个文档`);
    console.log(`输出目录: ${exporter.config.outputDir}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error(`\n发生错误: ${error.message}`);
    console.error(error.stack);
    await exporter.close();
    process.exit(1);
  }

  // 关闭浏览器
  console.log('\n浏览器将在3秒后关闭...');
  await exporter.page.waitForTimeout(3000);
  await exporter.close();
}

// 运行
main().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
