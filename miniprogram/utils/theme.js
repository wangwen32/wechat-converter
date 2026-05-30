/**
 * 主题管理工具
 * 用于页面间统一同步主题状态
 */

function getThemeData() {
  const app = getApp();
  const theme = (app && app.globalData && app.globalData.theme) || 'blue';
  return {
    theme: theme,
    themeClass: theme === 'dark' ? 'theme-dark' : '',
  };
}

/**
 * 在页面的 onLoad 和 onShow 中调用
 * 返回 { theme, themeClass }
 */
function initPageTheme() {
  return getThemeData();
}

module.exports = {
  getThemeData,
  initPageTheme,
};
