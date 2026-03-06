import { chromium } from 'playwright';
import path from 'path';

async function debug() {
  const userDataDir = path.join(process.cwd(), 'browser-data');
  const url = 'https://wepie.feishu.cn/wiki/ETakwStkHirDpXk53hOchvwwnaf?fromScene=spaceOverview';

  console.log('启动浏览器...');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
  });

  const page = await browser.newPage();

  console.log('访问页面...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('\n页面已加载，开始检查结构...\n');

  // 检查多种可能的子文档位置
  const analysis = await page.evaluate(() => {
    const result = {
      // 检查侧边栏
      sidebar: {
        wikiLinks: document.querySelectorAll('a[href*="/wiki/"]').length,
        allLinks: document.querySelectorAll('a').length,
      },
      // 检查页面内容区域的链接
      content: {
        mainContent: document.querySelector('[class*="content"]') ? true : false,
        wikiLinksInContent: 0,
      },
      // 检查是否有目录或导航元素
      navigation: {
        nav: document.querySelectorAll('nav').length,
        aside: document.querySelectorAll('aside').length,
        toc: document.querySelectorAll('[class*="toc"], [class*="catalog"]').length,
      },
      // 尝试找到React/Vue的数据
      dataAttributes: [],
      // 检查所有包含wiki链接的元素
      wikiLinkContainers: []
    };

    // 找到内容区域的wiki链接
    const contentArea = document.querySelector('[class*="content"]') || document.body;
    const contentWikiLinks = contentArea.querySelectorAll('a[href*="/wiki/"]');
    result.content.wikiLinksInContent = contentWikiLinks.length;

    // 找到包含data属性的元素
    document.querySelectorAll('*').forEach(el => {
      const attrs = {};
      for (let attr of el.attributes) {
        if (attr.name.startsWith('data-')) {
          attrs[attr.name] = attr.value.substring(0, 50);
        }
      }
      if (Object.keys(attrs).length > 0 && result.dataAttributes.length < 20) {
        result.dataAttributes.push({
          tag: el.tagName,
          attrs: attrs,
          text: el.textContent?.substring(0, 30)
        });
      }
    });

    // 找到所有wiki链接的父容器
    const wikiLinks = document.querySelectorAll('a[href*="/wiki/"]');
    const containers = new Set();
    wikiLinks.forEach(link => {
      let parent = link.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        const classes = parent.className || '';
        if (classes.includes('sidebar') || classes.includes('nav') ||
            classes.includes('menu') || classes.includes('tree')) {
          containers.add({
            tag: parent.tagName,
            classes: classes,
            childLinks: parent.querySelectorAll('a[href*="/wiki/"]').length
          });
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    });
    result.wikiLinkContainers = Array.from(containers);

    return result;
  });

  console.log('页面分析结果：');
  console.log(JSON.stringify(analysis, null, 2));

  console.log('\n\n尝试不同的选择器策略...\n');

  // 尝试多种选择器
  const strategies = [
    { name: '侧边栏通用', selector: '[class*="side"] a[href*="/wiki/"]' },
    { name: '导航栏', selector: 'nav a[href*="/wiki/"], aside a[href*="/wiki/"]' },
    { name: '树形结构', selector: '[class*="tree"] a[href*="/wiki/"]' },
    { name: '菜单', selector: '[class*="menu"] a[href*="/wiki/"]' },
    { name: '目录', selector: '[class*="catalog"] a[href*="/wiki/"], [class*="toc"] a[href*="/wiki/"]' },
    { name: '所有wiki链接', selector: 'a[href*="/wiki/"]' },
  ];

  for (const strategy of strategies) {
    const count = await page.locator(strategy.selector).count();
    console.log(`${strategy.name}: ${count} 个链接`);

    if (count > 0 && count < 50) {
      const links = await page.locator(strategy.selector).all();
      console.log('  前5个链接:');
      for (let i = 0; i < Math.min(5, links.length); i++) {
        const text = await links[i].textContent();
        const href = await links[i].getAttribute('href');
        console.log(`    - ${text?.trim().substring(0, 30)} | ${href?.substring(0, 50)}`);
      }
    }
  }

  console.log('\n\n浏览器保持打开状态，按 Ctrl+C 退出');
  console.log('你可以在浏览器开发者工具中查看页面结构\n');

  // 保持运行
  await new Promise(() => {});
}

debug().catch(console.error);
