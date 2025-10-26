import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');

  // Start browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the dev server to respond (simplified check)
    console.log('⏳ Waiting for dev server to respond...');
    
    let retries = 3;
    let serverReady = false;
    
    while (retries > 0 && !serverReady) {
      try {
        const response = await page.goto('http://localhost:9000', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        
        if (response && response.ok()) {
          serverReady = true;
          console.log('✅ Dev server responded with status:', response.status());
        } else {
          console.log(`⚠️ Dev server responded but not OK (status: ${response?.status()}), retrying...`);
          retries--;
          await page.waitForTimeout(3000);
        }
      } catch (err) {
        console.log(`⚠️ Dev server not ready yet, retries left: ${retries - 1}`);
        retries--;
        if (retries > 0) {
          await page.waitForTimeout(5000);
        }
      }
    }

    if (!serverReady) {
      console.log('⚠️ Dev server may not be fully ready, but continuing anyway...');
    } else {
      console.log('✅ Dev server is ready for testing');
    }

  } catch (error) {
    console.error('❌ Global setup warning:', error);
    // Don't throw - let tests fail individually if needed
    console.log('⚠️ Continuing with tests despite setup warning...');
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed');
}

export default globalSetup;
