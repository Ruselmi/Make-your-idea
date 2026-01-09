const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-web-security'] });
  const context = await browser.newContext();

  // Verify Ludo Horse
  console.log("Verifying Ludo Horse Icon...");
  const pageLudo = await context.newPage();
  await pageLudo.goto('file://' + path.resolve('ludo.html'));
  await pageLudo.evaluate(() => {
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    game.init();
    state.game.players[0].tokens[0] = 1;
    ui.renderTokens();
  });
  await pageLudo.screenshot({ path: 'ludo_horse_verify.png' });

  // Verify Monopoly Logic/Log
  console.log("Verifying Monopoly Log...");
  const pageMono = await context.newPage();
  await pageMono.goto('file://' + path.resolve('monopoly.html'));
  await pageMono.evaluate(() => {
    state.game.players = [{name: 'Tester', money: 1500, pos: 0, props: [], peerId: 'host'}];
    state.myIndex = 0;
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    game.init();
    // Simulate events
    ui.log("Test Log 1");
    game.handleRoll(5, 5); // Should trigger Move
  });
  await pageMono.screenshot({ path: 'monopoly_log_verify.png' });

  await browser.close();
})();
