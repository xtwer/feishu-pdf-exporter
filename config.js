import path from 'path';

/**
 * 飞书文档导出配置
 *
 * 所有选项都是可选的，这里只需要配置您想自定义的部分
 */
export default {
  // PDF输出目录（默认: 桌面/feishu_exports）
  outputDir: path.join(process.env.HOME, 'Desktop', 'feishu_exports'),

  // 浏览器数据目录，用于保存登录状态（默认: ./browser-data）
  // userDataDir: path.join(process.cwd(), 'browser-data'),

  // 是否使用无头模式（默认: false，显示浏览器窗口）
  // 设置为 true 可以在后台运行，但首次登录时需要设置为 false
  headless: false,

  // 页面加载延迟时间（毫秒）
  // 如果导出的PDF内容不完整，可以增加这个值
  delay: 3000,

  // 页面加载超时时间（毫秒）
  timeout: 60000,
};
