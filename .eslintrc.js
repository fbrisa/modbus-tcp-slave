module.exports = {
  "env": {
    "node": true,
    "browser": true,
    "commonjs": true,
    "es2021": true
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  plugins: ["jest"],
  overrides: [{
    files: ["**/*.test.js"],
    env: { "jest/globals": true },
    plugins: ["jest"],
    extends: ["plugin:jest/recommended"],
  }],
  settings: {
    jest: {
      version: 27,
    },
  },
  rules: {
    indent: [
      "error",
      2,
      { ObjectExpression: 1 }
    ],
    "array-bracket-newline": ["error", { "minItems": 3 }],
    "array-element-newline": ["error", { "minItems": 3 }],
    "linebreak-style": ["error", "unix"],
    "array-bracket-spacing": ["error", "never"],
    "function-call-argument-newline": ["error", "consistent"],
    "function-paren-newline": ["error", "consistent"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    "semi-style": ["error", "last"],
    "space-before-function-paren": 2,
    "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0 }],
    "padded-blocks": ["error", "never"],
    "space-infix-ops": ["error", { "int32Hint": false }],
    "max-len": ["error", { "code": 130 }],
    "no-tabs": 2,
    "brace-style": ["error", "1tbs"],
    "keyword-spacing": ["error"],
    "no-trailing-spaces": ["error"],
    "no-multi-spaces": ["error"],
    "comma-spacing": 2
  }
};
