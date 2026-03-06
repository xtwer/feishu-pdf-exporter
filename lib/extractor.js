import fs from 'fs';
import path from 'path';

/**
 * 从文件读取URL列表
 */
export function readUrlsFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const urls = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('/wiki/'));

  return urls;
}

/**
 * 验证飞书URL格式
 */
export function isValidFeishuUrl(url) {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('feishu.cn') &&
      urlObj.pathname.includes('/wiki/')
    );
  } catch (e) {
    return false;
  }
}

/**
 * 从多个来源获取URL列表
 * 优先级: 命令行参数 > urls.txt > 交互式输入
 */
export function getUrlSource(args) {
  // 从命令行获取URL或文件路径
  const input = args[0];

  if (!input) {
    // 检查默认的urls.txt文件
    const defaultFile = path.join(process.cwd(), 'urls.txt');
    if (fs.existsSync(defaultFile)) {
      return { type: 'file', value: defaultFile };
    }
    return { type: 'none', value: null };
  }

  // 判断是URL还是文件路径
  if (isValidFeishuUrl(input)) {
    return { type: 'url', value: input };
  }

  if (fs.existsSync(input)) {
    return { type: 'file', value: input };
  }

  throw new Error(`无效的输入: ${input}\n应该是飞书文档URL或urls.txt文件路径`);
}

/**
 * 生成浏览器控制台提取脚本
 */
export function generateExtractScript() {
  return `
// 飞书文档链接提取脚本
// 在飞书知识库页面的浏览器控制台中运行此脚本

(async function extractFeishuWikiLinks() {
  console.log('开始提取飞书文档链接...');

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 展开所有折叠节点
  const expandButtons = document.querySelectorAll('[aria-expanded="false"], [class*="expand"]');
  console.log(\`找到 \${expandButtons.length} 个折叠节点，正在展开...\`);

  for (const btn of expandButtons) {
    try {
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (e) {}
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // 提取所有wiki链接
  const links = document.querySelectorAll('a[href*="/wiki/"]');
  const uniqueUrls = new Set();

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes('/wiki/')) {
      let fullUrl = href;
      if (href.startsWith('/')) {
        fullUrl = window.location.origin + href;
      }
      fullUrl = fullUrl.split('?')[0].split('#')[0];
      const title = link.textContent?.trim() || '';
      if (fullUrl.match(/\\/wiki\\/[a-zA-Z0-9]+$/)) {
        uniqueUrls.add({ url: fullUrl, title });
      }
    }
  });

  const urlList = Array.from(uniqueUrls);
  console.log(\`找到 \${urlList.length} 个文档链接\`);

  // 生成文件内容
  const fileContent = [
    '# 飞书文档URL列表',
    \`# 提取时间: \${new Date().toLocaleString('zh-CN')}\`,
    \`# 文档数量: \${urlList.length}\`,
    '',
    ...urlList.map(item => item.title ? \`# \${item.title}\\n\${item.url}\` : item.url)
  ].join('\\n');

  // 下载文件
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'urls.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('✓ 链接已导出到 urls.txt 文件');
  console.log('请将文件放到项目目录，然后运行: npm start urls.txt');

  return urlList;
})();
`.trim();
}
