const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-web-security'] });
  const context = await browser.newContext();

  console.log("Verifying New File Structure...");

  // 1. Check Main Menu
  const pageIndex = await context.newPage();
  await pageIndex.goto('file://' + path.resolve('index.html'));
  const unoCard = await pageIndex.$('.game-card');
  if (unoCard) console.log("✅ Main Menu loaded.");
  else console.error("❌ Main Menu failed.");
  await pageIndex.screenshot({ path: 'verify_new_home.png' });

  // 2. Check Uno Page
  const pageUno = await context.newPage();
  await pageUno.goto('file://' + path.resolve('uno.html'));
  const unoTitle = await pageUno.title();
  if (unoTitle.includes('Uno')) console.log("✅ Uno page loaded.");
  else console.error("❌ Uno page failed.");

  // 3. Check Ludo Page
  const pageLudo = await context.newPage();
  await pageLudo.goto('file://' + path.resolve('ludo.html'));
  if (await pageLudo.$('.ludo-board')) console.log("✅ Ludo board loaded.");
  else console.error("❌ Ludo board failed.");

  // 4. Check Catur Page
  const pageChess = await context.newPage();
  await pageChess.goto('file://' + path.resolve('catur.html'));
  if (await pageChess.$('#chess-board')) console.log("✅ Chess board loaded.");
  else console.error("❌ Chess board failed.");

  // 5. Check Monopoli Page
  const pageMono = await context.newPage();
  await pageMono.goto('file://' + path.resolve('monopoli.html'));
  if (await pageMono.$('.board-container')) console.log("✅ Monopoly board loaded.");
  else console.error("❌ Monopoly board failed.");

  await browser.close();
})();
