import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');

  // Start browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for dev server to be ready...');
    await page.goto('http://localhost:9000', { waitUntil: 'networkidle' });

    // Verify the app loads
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Dev server is ready');

    // You can add additional setup here, such as:
    // - Creating test users
    // - Setting up test data
    // - Configuring test environment

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed');
}

export default globalSetup;
