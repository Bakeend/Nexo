module.exports = {
  extends: 'expo',
  rules: {
    'no-console': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/purity': 'off',
    // React Native Animated.Value is intentionally read during render for animated styles.
    'react-hooks/refs': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/array-type': 'off',
    'import/no-unresolved': 'off',
  },
};
