const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    reporter: 'list',
    use: { trace: 'retain-on-failure' },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'], browserName: 'firefox' } },
        { name: 'webkit', use: { ...devices['Desktop Safari'], browserName: 'webkit' } },
        { name: 'pixel-chromium', use: { ...devices['Pixel 5'], browserName: 'chromium' } },
        { name: 'iphone-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } }
    ]
});
