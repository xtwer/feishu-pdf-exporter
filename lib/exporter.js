import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

/**
 * 飞书文档导出器类
 */
export class FeishuExporter {
  constructor(options = {}) {
    this.config = {
      outputDir: options.outputDir || path.join(process.env.HOME, 'Desktop', 'feishu_exports'),
      userDataDir: options.userDataDir || path.join(process.cwd(), 'browser-data'),
      headless: options.headless !== undefined ? options.headless : false,
      delay: options.delay || 3000,
      timeout: options.timeout || 60000,
      ...options
    };

    this.browser = null;
    this.page = null;
  }

  /**
   * 确保目录存在
   */
  ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 清理文件名（移除非法字符）
   */
  sanitizeFileName(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .substring(0, 100);
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(timeout = 5000) {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (e) {
      console.log('网络空闲等待超时，继续执行...');
    }
  }

  /**
   * 初始化浏览器
   */
  async init() {
    this.ensureDir(this.config.outputDir);
    this.ensureDir(this.config.userDataDir);

    console.log('正在启动浏览器...');
    this.browser = await chromium.launchPersistentContext(this.config.userDataDir, {
      headless: this.config.headless,
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
    });

    this.page = await this.browser.newPage();
  }

  /**
   * 检查并处理登录
   */
  async handleLogin(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
    await this.page.waitForTimeout(3000);

    const currentUrl = this.page.url();
    if (currentUrl.includes('login') || currentUrl.includes('accounts')) {
      console.log('\n⚠️  需要登录，请在浏览器中完成登录...');
      console.log('登录完成后，脚本将自动继续执行\n');

      await this.page.waitForURL(url => {
        const urlStr = url.toString();
        return !urlStr.includes('login') && !urlStr.includes('accounts');
      }, { timeout: 300000 });

      console.log('✓ 登录成功！\n');
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * 导出单个文档为PDF
   */
  async exportToPDF(docUrl, outputPath, title) {
    try {
      console.log(`正在导出: ${title}`);

      await this.page.goto(docUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
      await this.page.waitForTimeout(this.config.delay);
      await this.waitForNetworkIdle(5000);

      // 等待文档内容加载
      await this.page.waitForTimeout(5000);

      // 尝试关闭可能的弹窗
      try {
        const closeButtons = await this.page.locator('[class*="close"], [class*="dismiss"]').all();
        for (const btn of closeButtons.slice(0, 3)) {
          try {
            if (await btn.isVisible()) {
              await btn.click({ timeout: 1000 });
            }
          } catch (e) {}
        }
      } catch (e) {}

      // 导出为PDF
      await this.page.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        printBackground: true,
        preferCSSPageSize: false,
      });

      console.log(`✓ 已保存: ${path.basename(outputPath)}\n`);
      return true;
    } catch (error) {
      console.error(`✗ 导出失败 [${title}]: ${error.message}\n`);
      return false;
    }
  }

  /**
   * 从URL列表导出文档
   */
  async exportFromUrls(urls) {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('URL列表为空或格式错误');
    }

    console.log(`\n开始导出 ${urls.length} 个文档...\n`);
    let successCount = 0;
    let failCount = 0;

    // 处理登录
    await this.handleLogin(urls[0]);

    // 批量导出
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const progress = `[${i + 1}/${urls.length}]`;

      try {
        // 先访问页面获取标题
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
        await this.page.waitForTimeout(2000);

        const title = await this.page.title();
        const cleanTitle = title.replace(/ - 飞书云文档$/, '').trim() || `doc_${i + 1}`;
        const fileName = `${this.sanitizeFileName(cleanTitle)}.pdf`;
        const outputPath = path.join(this.config.outputDir, fileName);

        console.log(`${progress} ${cleanTitle}`);
        const success = await this.exportToPDF(url, outputPath, cleanTitle);

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`${progress} 导出失败: ${error.message}\n`);
        failCount++;
      }

      await this.page.waitForTimeout(1000);
    }

    return { successCount, failCount, total: urls.length };
  }

  /**
   * 从知识库页面自动提取文档树并导出
   * 只导出指定文档及其所有子文档
   */
  async exportFromWiki(wikiUrl) {
    console.log(`正在访问知识库: ${wikiUrl}\n`);

    await this.handleLogin(wikiUrl);
    await this.waitForNetworkIdle(10000);

    // 提取当前文档的ID
    const currentDocMatch = wikiUrl.match(/\/wiki\/([^?#/]+)/);
    const currentDocId = currentDocMatch ? currentDocMatch[1] : null;
    console.log(`当前文档ID: ${currentDocId}\n`);

    // 获取主文档标题
    const mainTitle = await this.page.title();
    const mainCleanTitle = mainTitle.replace(/ - 飞书云文档$/, '').trim() || '主文档';

    // 获取文档树（只获取当前文档下的子文档）
    const tree = await this.extractDocumentTree(currentDocId);

    // 打印完整的文档目录结构
    console.log('\n' + '='.repeat(60));
    console.log('📋 文档目录结构');
    console.log('='.repeat(60));
    console.log(`\n📄 [主文档] ${mainCleanTitle}`);

    if (tree.length === 0) {
      console.log('   └─ (无子文档)');
      console.log('\n提示: 该文档没有子文档，只导出主文档\n');
    } else {
      console.log(`   └─ 共 ${tree.length} 个子文档:`);
      tree.forEach((doc, idx) => {
        const isLast = idx === tree.length - 1;
        const prefix = isLast ? '      └─' : '      ├─';
        const indent = '  '.repeat(Math.max(0, doc.level - 1));
        console.log(`${prefix}${indent} ${doc.title}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(`总计: 1 个主文档 + ${tree.length} 个子文档 = ${tree.length + 1} 个文档`);
    console.log('='.repeat(60) + '\n');

    // 开始导出
    console.log('开始导出所有文档...\n');

    // 先导出主文档
    console.log('[1/' + (tree.length + 1) + '] 导出主文档...');
    const mainFileName = `${this.sanitizeFileName(mainCleanTitle)}.pdf`;
    const mainOutputPath = path.join(this.config.outputDir, mainFileName);

    const mainSuccess = await this.exportToPDF(wikiUrl, mainOutputPath, mainCleanTitle);

    // 如果没有子文档，直接返回主文档的结果
    if (tree.length === 0) {
      return {
        successCount: mainSuccess ? 1 : 0,
        failCount: mainSuccess ? 0 : 1,
        total: 1
      };
    }

    // 转换为URL列表
    const urls = tree.map(doc => {
      const url = doc.url.startsWith('http') ? doc.url : `https://wepie.feishu.cn${doc.url}`;
      return url;
    });

    // 导出子文档
    const result = await this.exportFromUrls(urls);

    // 加上主文档的计数
    result.successCount += mainSuccess ? 1 : 0;
    result.failCount += mainSuccess ? 0 : 1;
    result.total += 1;

    return result;
  }

  /**
   * 从侧边栏提取文档树（自动展开并识别层级）
   * 只提取指定文档的子文档
   */
  async extractDocumentTree(parentDocId = null) {
    console.log('从侧边栏提取文档树...');

    // 等待页面稳定
    console.log('等待页面加载（请确保已登录飞书）...');
    await this.page.waitForTimeout(5000);

    // 检查是否需要登录
    const needsLogin = await this.page.evaluate(() => {
      return window.location.href.includes('login') ||
             window.location.href.includes('passport') ||
             document.body.textContent?.includes('登录');
    });

    if (needsLogin) {
      console.log('\n⚠️  需要登录！');
      console.log('请在打开的浏览器中完成登录，然后按回车继续...\n');

      // 等待用户登录
      await new Promise(resolve => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl.question('登录完成后按回车继续...', () => {
          rl.close();
          resolve();
        });
      });

      await this.page.waitForTimeout(2000);
    }

    console.log('开始提取侧边栏内容...');

    // 尝试点击侧边栏使其显示
    try {
      console.log('尝试激活侧边栏...');
      // 点击页面上的某个元素来触发侧边栏加载
      await this.page.mouse.move(100, 300);
      await this.page.mouse.click(100, 300);
      await this.page.waitForTimeout(2000);
    } catch (e) {}

    // 多次尝试展开所有折叠节点
    console.log('展开所有折叠节点...');
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const expandButtons = await this.page.locator('[aria-expanded="false"]').all();
        let expandCount = 0;

        for (const button of expandButtons) {
          try {
            if (await button.isVisible()) {
              await button.click({ timeout: 500 });
              expandCount++;
              await this.page.waitForTimeout(200);
            }
          } catch (e) {}
        }

        if (expandCount > 0) {
          console.log(`  第${attempt + 1}轮：展开了 ${expandCount} 个节点`);
          await this.page.waitForTimeout(2000);
        } else if (attempt > 0) {
          console.log('  所有节点已展开');
          break;
        }
      } catch (e) {
        console.log(`  展开节点出错: ${e.message}`);
      }
    }

    await this.page.waitForTimeout(3000);

    // 检查侧边栏是否加载（使用新的选择器）
    console.log('检查侧边栏内容...');
    const sidebarCheck = await this.page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-node-uid]');
      return {
        nodeCount: nodes.length,
        hasContent: nodes.length > 0
      };
    });

    console.log(`侧边栏检测: 找到 ${sidebarCheck.nodeCount} 个文档节点`);

    if (!sidebarCheck.hasContent) {
      console.log('⚠️  警告: 侧边栏可能未加载，但继续尝试提取...');
    }

    console.log('\n开始提取文档树...');
    await this.page.waitForTimeout(1000);

    // 从侧边栏提取文档树（使用data-node-uid）
    const tree = await this.page.evaluate((targetDocId) => {
      const allDocs = [];
      const nodeElements = document.querySelectorAll('[data-node-uid]');

      console.log(`扫描到 ${nodeElements.length} 个文档节点`);

      nodeElements.forEach(node => {
        const uid = node.getAttribute('data-node-uid');
        if (!uid) return;

        // 解析 data-node-uid: level=1&rootNodeId=TOC-ROOT&wikiToken=xxx
        const params = new URLSearchParams(uid);
        const wikiToken = params.get('wikiToken');
        const level = parseInt(params.get('level')) || 0;

        if (!wikiToken) return;

        const title = node.textContent?.trim() || wikiToken;
        const url = `${window.location.origin}/wiki/${wikiToken}`;

        allDocs.push({
          docId: wikiToken,
          title,
          url,
          level,
          uid
        });
      });

      console.log(`提取到 ${allDocs.length} 个文档`);

      // 如果指定了父文档ID，只提取其子文档
      if (targetDocId) {
        const parentIndex = allDocs.findIndex(doc => doc.docId === targetDocId);

        if (parentIndex >= 0) {
          const parentLevel = allDocs[parentIndex].level;
          console.log(`找到父文档: ${allDocs[parentIndex].title} (Level ${parentLevel})`);

          // 提取所有子文档（从父文档之后，层级更深的文档）
          const children = [];
          for (let i = parentIndex + 1; i < allDocs.length; i++) {
            const doc = allDocs[i];
            // 如果遇到同级或更高级的文档，停止
            if (doc.level <= parentLevel) {
              console.log(`遇到同级文档，停止收集: ${doc.title} (Level ${doc.level})`);
              break;
            }
            children.push(doc);
          }

          console.log(`提取到 ${children.length} 个子文档`);
          return children;
        } else {
          console.log(`警告: 未找到父文档 ${targetDocId}`);
          return [];
        }
      }

      // 如果没有指定父文档，返回所有文档
      return allDocs;
    }, parentDocId);

    // 去重
    const seen = new Set();
    const uniqueDocs = tree.filter(doc => {
      if (seen.has(doc.docId)) return false;
      seen.add(doc.docId);
      return true;
    });

    console.log(`✓ 提取完成，找到 ${uniqueDocs.length} 个子文档\n`);

    return uniqueDocs.map(doc => ({
      id: doc.docId,
      title: doc.title,
      url: doc.url,
      level: doc.level
    }));
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
