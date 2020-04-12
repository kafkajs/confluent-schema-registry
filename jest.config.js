module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false, // https://huafu.github.io/ts-jest/user/config/diagnostics
    },
  },
  testPathIgnorePatterns: ['/node_modules/'],
  watchPathIgnorePatterns: ['/node_modules/'],
  roots: ['.'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  projects: ['<rootDir>/src'],
}
