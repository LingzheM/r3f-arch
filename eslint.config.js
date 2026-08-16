// eslint.config.js（flat config）
import tseslint from 'typescript-eslint'

/** 三层都要用的 TS 解析设置 */
const ts = {
  plugins: { '@typescript-eslint': tseslint.plugin },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
}

export default [
  {
    files: ['src/core/**/*.{ts,tsx}'],
    ...ts,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: 'three',
          message: 'core 不许依赖 three。几何计算写成纯函数。',
          // scene-registry.ts 需要 `import type * as THREE`，类型导入编译后会被抹掉，
          // 不构成运行时依赖 —— 所以放行。这是原项目绕过自己那条铁律的同一招。
          allowTypeImports: true,
        }],
        patterns: [
          { group: ['three/*', '@react-three/*'], message: 'core 不许依赖渲染层。', allowTypeImports: true },
          { group: ['**/viewer/**', '**/app/**'],  message: 'core 不许反向依赖上层。' },
        ],
      }],
    },
  },
  {
    files: ['src/viewer/**/*.{ts,tsx}'],
    ...ts,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [{ group: ['**/app/**'], message: 'viewer 不许知道 editor/app 的存在。' }],
      }],
    },
  },
]
