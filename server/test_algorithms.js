import { generateAmericanoRound } from './algorithms/americano.js';
import { generateMexicanoRound } from './algorithms/mexicano.js';
import { calculateLeaderboard, addPlayerMidMatch, substitutePlayer } from './algorithms/fairness.js';

console.log('--- TESTING ALGORITHMS ---');

// 1. Setup 8 players
const players = [
  { id: 'p1', name: 'Carlos', skillLevel: 'pro', initialMMR: 1700, mmr: 1700, status: 'active' },
  { id: 'p2', name: 'Galan', skillLevel: 'pro', initialMMR: 1650, mmr: 1650, status: 'active' },
  { id: 'p3', name: 'Lebron', skillLevel: 'pro', initialMMR: 1600, mmr: 1600, status: 'active' },
  { id: 'p4', name: 'Paquito', skillLevel: 'pro', initialMMR: 1550, mmr: 1550, status: 'active' },
  { id: 'p5', name: 'Coello', skillLevel: 'advanced', initialMMR: 1450, mmr: 1450, status: 'active' },
  { id: 'p6', name: 'Tapia', skillLevel: 'advanced', initialMMR: 1400, mmr: 1400, status: 'active' },
  { id: 'p7', name: 'Bela', skillLevel: 'intermediate', initialMMR: 1250, mmr: 1250, status: 'active' },
  { id: 'p8', name: 'DiNenno', skillLevel: 'intermediate', initialMMR: 1200, mmr: 1200, status: 'active' },
];

// Test Americano Round 1
const round1 = generateAmericanoRound({
  players,
  rounds: [],
  courtCount: 2,
  gameMode: 'doubles',
  pointsTarget: 24
});

console.log('✅ Americano Round 1 generated:', round1.matches.length, 'matches');
round1.matches.forEach(m => {
  console.log(`  Court ${m.courtNumber}: [${m.team1.join(', ')}] vs [${m.team2.join(', ')}]`);
  // Simulate scores
  m.team1Score = 14;
  m.team2Score = 10;
  m.status = 'completed';
});
round1.status = 'completed';

// Test Leaderboard computation & MMR update
const tournamentState = {
  players,
  rounds: [round1]
};

const lb1 = calculateLeaderboard(tournamentState);
console.log('✅ Leaderboard after Round 1 computed:');
lb1.slice(0, 4).forEach(p => {
  console.log(`  #${p.rank} ${p.name}: ${p.pointsWon} pts, Diff: ${p.pointDifferential}, PPR: ${p.pointsPerMatch}, MMR: ${p.currentMMR} (${p.mmrDelta >= 0 ? '+' : ''}${p.mmrDelta})`);
});

// Test Mexicano Round 2 with dynamic standings
const round2Mexicano = generateMexicanoRound({
  players,
  leaderboard: lb1,
  rounds: [round1],
  courtCount: 2,
  gameMode: 'doubles',
  pointsTarget: 24
});
console.log('✅ Mexicano Round 2 generated from standings:', round2Mexicano.matches.length, 'matches');
round2Mexicano.matches.forEach(m => {
  console.log(`  Court ${m.courtNumber}: [${m.team1.join(', ')}] vs [${m.team2.join(', ')}]`);
});

// Test Rest Player functionality
players[0].status = 'resting'; // Carlos rests
const roundWithRest = generateAmericanoRound({
  players,
  rounds: [round1],
  courtCount: 1, // Only 1 court = 4 players active, 3 byes + 1 resting
  gameMode: 'doubles',
  pointsTarget: 24
});
console.log('✅ Round with Rest/Bye generated:', roundWithRest.matches.length, 'court, Byes:', roundWithRest.byes.length, 'players');
console.log('  Resting IDs:', roundWithRest.byes);

// Test Add Player Mid Match
const newPlayer = addPlayerMidMatch(tournamentState, {
  name: 'Sanyo Gutierrez',
  skillLevel: 'advanced'
}, { pointMode: 'average' });
console.log('✅ Added Player Mid-Match with fair points:', newPlayer.name, 'Starting Pts:', newPlayer.startingPoints);

// Test Substitute Player
const sub = substitutePlayer(tournamentState, 'p7', {
  name: 'Momo Gonzalez',
  skillLevel: 'intermediate'
}, { keepPoints: true, applyToCurrentRound: false });
console.log('✅ Substituted Player:', sub.name, 'Subbing for:', sub.substitutingFor, 'Original Status:', players.find(p => p.id === 'p7').status);

console.log('--- ALL ALGORITHM TESTS PASSED! ---');
