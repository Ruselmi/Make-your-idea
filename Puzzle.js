
class PuzzleManager {
    constructor() {
        this.puzzles = {
            generator: { solved: false, state: 0 }, // Requires sync press
            mirror: { solved: false, symbols: [] }, // Requires voice comms
            radio: { solved: false, freq: 0 }
        };
    }

    interact(id, playerRole) {
        if(id === 'generator') {
            if(playerRole === 'physical') {
                // Physical tries to start
                return { action: 'start_attempt' };
            } else {
                // Observer reads gauge
                return { msg: 'Tekanan terlalu tinggi!' };
            }
        }
        return null;
    }

    solve(id) {
        if(this.puzzles[id]) this.puzzles[id].solved = true;
    }
}
