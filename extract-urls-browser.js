// 飞书知识库文档提取脚本 - 递归提取指定文档的所有子文档
//
// 使用方法：
// 1. 在浏览器中打开飞书知识库页面（任意文档）
// 2. 按 F12 打开开发者工具，切换到 Console 标签
// 3. 复制粘贴这段代码到控制台并按回车
// 4. 自动下载 urls.txt 文件
// 5. 运行: npm start

(async function extractFeishuDocs() {
  console.log('%c=== 飞书文档提取工具 ===', 'color: #1890ff; font-size: 16px; font-weight: bold;');

  // 获取当前文档ID
  const currentUrl = window.location.href;
  const currentDocMatch = currentUrl.match(/\/wiki\/([^?#/]+)/);
  const currentDocId = currentDocMatch ? currentDocMatch[1] : null;

  console.log('当前文档ID:', currentDocId);
  console.log('开始提取侧边栏文档树...\n');

  // 等待侧边栏加载
  await new Promise(r => setTimeout(r, 2000));

  // 展开所有折叠节点
  let expandCount = 0;
  for (let i = 0; i < 3; i++) {
    const expandBtns = document.querySelectorAll('[aria-expanded="false"]');
    for (const btn of expandBtns) {
      try {
        btn.click();
        expandCount++;
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`✓ 展开了 ${expandCount} 个折叠节点`);

  await new Promise(r => setTimeout(r, 2000));

  // 提取侧边栏中的所有文档节点（使用新的 data-node-uid 选择器）
  const allLinks = [];
  const nodeElements = document.querySelectorAll('[data-node-uid]');

  console.log(`找到 ${nodeElements.length} 个文档节点，开始解析...\n`);

  nodeElements.forEach(node => {
    const uid = node.getAttribute('data-node-uid');
    if (!uid) return;

    // 解析 data-node-uid: level=1&rootNodeId=TOC-ROOT&wikiToken=xxx
    const params = new URLSearchParams(uid);
    const wikiToken = params.get('wikiToken');
    const level = parseInt(params.get('level')) || 0;

    if (!wikiToken) return;

    const docId = wikiToken;
    const title = node.textContent?.trim() || docId;
    const fullUrl = `${window.location.origin}/wiki/${wikiToken}`;

    allLinks.push({ docId, title, url: fullUrl, level, uid });
  });

  // 如果指定了当前文档，只提取它的子文档
  let filteredLinks = allLinks;
  if (currentDocId) {
    // 找到当前文档的位置和层级
    const currentIndex = allLinks.findIndex(doc => doc.docId === currentDocId);
    if (currentIndex >= 0) {
      const currentLevel = allLinks[currentIndex].level;
      console.log(`当前文档: ${allLinks[currentIndex].title} (Level ${currentLevel})`);
      console.log('只提取其子文档...\n');

      // 提取子文档：从当前文档之后，层级更深的所有文档
      filteredLinks = [];
      for (let i = currentIndex + 1; i < allLinks.length; i++) {
        const doc = allLinks[i];
        // 如果遇到同级或更高级的文档，停止
        if (doc.level <= currentLevel) break;
        filteredLinks.push(doc);
      }
    }
  }

  // 去重
  const seen = new Set();
  const uniqueDocs = filteredLinks.filter(doc => {
    if (seen.has(doc.docId)) return false;
    seen.add(doc.docId);
    return true;
  });

  console.log(`%c✓ 提取完成！`, 'color: #52c41a; font-weight: bold;');
  console.log(`找到 ${uniqueDocs.length} 个子文档\n`);

  // 显示文档列表
  console.log('%c文档列表：', 'color: #1890ff; font-weight: bold;');
  uniqueDocs.forEach((doc, idx) => {
    const indent = '  '.repeat(doc.level);
    console.log(`${idx + 1}. ${indent}${doc.title}`);
  });

  // 生成文件内容
  const lines = [
    '# 飞书文档URL列表',
    `# 提取时间: ${new Date().toLocaleString('zh-CN')}`,
    `# 根文档: ${currentDocId ? allLinks.find(d => d.docId === currentDocId)?.title : '全部'}`,
    `# 文档数量: ${uniqueDocs.length}`,
    '',
  ];

  uniqueDocs.forEach(doc => {
    lines.push(`# ${doc.title}`);
    lines.push(doc.url);
    lines.push('');
  });

  const content = lines.join('\n');

  // 下载文件
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'urls.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('\n%c✓ urls.txt 已下载', 'color: #52c41a; font-size: 14px; font-weight: bold;');
  console.log('%c接下来运行: npm start', 'color: #1890ff;');

  return uniqueDocs;
})();
