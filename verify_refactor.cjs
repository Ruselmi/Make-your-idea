const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-web-security'] });
  const context = await browser.newContext();

  console.log("Verifying Refactored Index (Home)...");
  const pageIndex = await context.newPage();
  await pageIndex.goto('file://' + path.resolve('index.html'));

  // Verify links to games exist
  const ludoBtn = await pageIndex.$('button[onclick*="ludo.html"]');
  const monoBtn = await pageIndex.$('button[onclick*="monopoly.html"]');

  if (ludoBtn && monoBtn) {
      console.log("✅ Home menu links found.");
  } else {
      console.error("❌ Home menu links missing.");
  }
  await pageIndex.screenshot({ path: 'refactor_home.png' });

  console.log("Verifying Refactored Ludo...");
  const pageLudo = await context.newPage();
  await pageLudo.goto('file://' + path.resolve('ludo.html'));
  await pageLudo.evaluate(() => {
      document.getElementById('screen-home').classList.add('hidden');
      document.getElementById('screen-game').classList.remove('hidden');
      game.init();
  });
  await pageLudo.screenshot({ path: 'refactor_ludo.png' });

  console.log("Verifying Refactored Monopoly...");
  const pageMono = await context.newPage();
  await pageMono.goto('file://' + path.resolve('monopoly.html'));
  await pageMono.evaluate(() => {
      // Mock players for Monopoly init
      state.game.players = [
          {name: 'P1', money: 1500, pos: 0, props: []},
          {name: 'P2', money: 1500, pos: 0, props: []}
      ];
      state.myIndex = 0;

      document.getElementById('screen-home').classList.add('hidden');
      document.getElementById('screen-game').classList.remove('hidden');
      game.init();
  });
  await pageMono.screenshot({ path: 'refactor_mono.png' });

  await browser.close();
})();
