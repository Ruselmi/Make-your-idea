document.addEventListener('DOMContentLoaded', () => {
    // Animate Cards on Load
    const cards = document.querySelectorAll('.game-card');
    cards.forEach((c, i) => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(20px)';
        setTimeout(() => {
            c.style.transition = 'all 0.5s ease';
            c.style.opacity = '1';
            c.style.transform = 'translateY(0)';
        }, i * 100);
    });
});

window.nav = {
    go: (game) => {
        const target = game + '.html';
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            window.location.href = target;
        }, 500);
    }
};
