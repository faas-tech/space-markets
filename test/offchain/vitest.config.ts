import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test configuration
    environment: 'node',
    globals: false,
    includeSource: ['src/**/*.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    },
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 30000, // 30 seconds for beforeAll/afterAll
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});