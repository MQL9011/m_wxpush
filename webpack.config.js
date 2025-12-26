const path = require('path');

module.exports = (options) => {
  return {
    ...options,
    entry: './src/main.ts',
    output: {
      ...options.output,
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist'),
    },
    // 将所有依赖打包进单文件（可选，不推荐用于生产）
    // externals: [],
  };
};
