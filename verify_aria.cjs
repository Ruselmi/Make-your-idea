const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-web-security'] });
  const context = await browser.newContext();

  console.log("Verifying ARIA labels in index.html...");
  const pageIndex = await context.newPage();
  await pageIndex.goto('file://' + path.resolve('index.html'));

  // Verify specific elements have aria-label
  const ariaLabelsToCheck = [
    'Randomize Name',
    'Toggle Chat',
    'Close Chat',
    'Previous Track',
    'Toggle Mute',
    'Next Track',
    'Search Music',
    'Toggle Voice',
    'Close' // For modal close buttons
  ];

  for (const label of ariaLabelsToCheck) {
    const element = await pageIndex.$(`[aria-label="${label}"]`);
    if (element) {
      console.log(`✅ Found element with aria-label="${label}"`);
    } else {
      console.error(`❌ Missing element with aria-label="${label}"`);
    }
  }

  // Take a screenshot just in case visuals changed
  await pageIndex.screenshot({ path: 'index_aria_verify.png' });

  console.log("Verifying ARIA labels in ludo.html...");
  const pageLudo = await context.newPage();
  await pageLudo.goto('file://' + path.resolve('ludo.html'));

  const ludoLabels = ['Previous Track', 'Toggle Mute', 'Next Track', 'Search Music', 'Toggle Voice'];
  for (const label of ludoLabels) {
      const element = await pageLudo.$(`[aria-label="${label}"]`);
      if (element) {
        console.log(`✅ Found element with aria-label="${label}" in Ludo`);
      } else {
        console.error(`❌ Missing element with aria-label="${label}" in Ludo`);
      }
  }

  await browser.close();
})();
