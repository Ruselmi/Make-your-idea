const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-web-security'] });
  const context = await browser.newContext();

  // Verify Ludo HD
  console.log("Verifying Ludo...");
  const pageLudo = await context.newPage();
  await pageLudo.goto('file://' + path.resolve('ludo.html'));
  await pageLudo.evaluate(() => {
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    game.init();
    // Add dummy tokens
    state.game.players[0].tokens[0] = 1;
    state.game.players[1].tokens[0] = 14;
    ui.renderTokens();
  });
  await pageLudo.screenshot({ path: 'ludo_hd_verify.png' });
  console.log("Ludo HD screenshot taken.");

  // Verify Monopoly HD
  console.log("Verifying Monopoly...");
  const pageMono = await context.newPage();
  await pageMono.goto('file://' + path.resolve('monopoly.html'));
  await pageMono.evaluate(() => {
    // Mock players required for game.init()
    state.game.players = [
        {name: 'Player 1', money: 1500, pos: 0, props: []},
        {name: 'Player 2', money: 1500, pos: 5, props: []},
        {name: 'Player 3', money: 1500, pos: 10, props: []},
        {name: 'Player 4', money: 1500, pos: 20, props: []}
    ];
    state.myIndex = 0;

    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    game.init();
  });
  await pageMono.screenshot({ path: 'monopoly_hd_verify.png' });
  console.log("Monopoly HD screenshot taken.");

  await browser.close();
})();
