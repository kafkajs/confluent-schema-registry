module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false, // https://huafu.github.io/ts-jest/user/config/diagnostics
    },
    'jest-mock-proxy': {},
  },
  testPathIgnorePatterns: ['/node_modules/'],
  setupFiles: ['./jestSetup/framework.js'],
  roots: ['./src'],
  projects: ['<rootDir>/src'],
}
