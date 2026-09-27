import { buildHistoryMatrix } from './americano.js';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'm_' + Math.random().toString(36).substring(2, 9);
}

export function generateMexicanoRound({
  players,
  leaderboard = [],
  rounds = [],
  courtCount = 2,
  gameMode = 'doubles',
  pointsTarget = 24
}) {
  const roundNumber = rounds.length + 1;
  const history = buildHistoryMatrix(rounds);

  const manuallyResting = players.filter(p => p.status === 'resting' || p.status === 'late' || p.status === 'injured');
  const availablePlayers = players.filter(p => p.status === 'active' || !p.status);

  const playerRankMap = new Map();
  leaderboard.forEach((entry, idx) => {
    playerRankMap.set(entry.id, idx);
  });

  const rankedPlayers = [...availablePlayers].sort((a, b) => {
    const rankA = playerRankMap.has(a.id) ? playerRankMap.get(a.id) : 9999;
    const rankB = playerRankMap.has(b.id) ? playerRankMap.get(b.id) : 9999;
    if (rankA !== rankB) return rankA - rankB;
    const mmrA = a.mmr || 1200;
    const mmrB = b.mmr || 1200;
    if (mmrB !== mmrA) return mmrB - mmrA;
    return Math.random() - 0.5;
  });

  const playersPerCourt = gameMode === 'singles' ? 2 : 4;
  const maxActivePlayers = courtCount * playersPerCourt;
  const totalSlotsNeeded = Math.min(rankedPlayers.length - (rankedPlayers.length % playersPerCourt), maxActivePlayers);

  if (totalSlotsNeeded < playersPerCourt) {
    throw new Error(`Minimal ${playersPerCourt} pemain aktif dibutuhkan untuk mode ${gameMode}`);
  }

  const numByesNeeded = rankedPlayers.length - totalSlotsNeeded;
  let activeForRound = [...rankedPlayers];
  let roundByes = [...manuallyResting.map(p => p.id)];

  if (numByesNeeded > 0) {
    const byeCandidates = [...rankedPlayers].sort((a, b) => {
      const byeA = history.byeHistory[a.id] || 0;
      const byeB = history.byeHistory[b.id] || 0;
      if (byeA !== byeB) return byeA - byeB;
      return rankedPlayers.indexOf(b) - rankedPlayers.indexOf(a);
    });

    const chosenToRest = byeCandidates.slice(0, numByesNeeded);
    const restingIds = new Set(chosenToRest.map(p => p.id));
    activeForRound = rankedPlayers.filter(p => !restingIds.has(p.id));
    roundByes.push(...chosenToRest.map(p => p.id));
  }

  const actualCourts = Math.floor(activeForRound.length / playersPerCourt);
  const matches = [];

  for (let c = 0; c < actualCourts; c++) {
    if (gameMode === 'doubles') {
      const courtPlayers = activeForRound.slice(c * 4, c * 4 + 4);
      const [p1, p2, p3, p4] = courtPlayers;

      const options = [
        {
          team1: [p1.id, p4.id],
          team2: [p2.id, p3.id],
          partnerPenalty: (history.partnerHistory[p1.id]?.[p4.id] || 0) + (history.partnerHistory[p2.id]?.[p3.id] || 0)
        },
        {
          team1: [p1.id, p3.id],
          team2: [p2.id, p4.id],
          partnerPenalty: (history.partnerHistory[p1.id]?.[p3.id] || 0) + (history.partnerHistory[p2.id]?.[p4.id] || 0)
        },
        {
          team1: [p1.id, p2.id],
          team2: [p3.id, p4.id],
          partnerPenalty: (history.partnerHistory[p1.id]?.[p2.id] || 0) + (history.partnerHistory[p3.id]?.[p4.id] || 0)
        }
      ];

      options.sort((a, b) => a.partnerPenalty - b.partnerPenalty);
      const chosen = options[0];

      matches.push({
        id: generateId(),
        courtNumber: c + 1,
        team1: chosen.team1,
        team2: chosen.team2,
        team1Score: 0,
        team2Score: 0,
        status: 'pending',
        pointsTarget
      });
    } else if (gameMode === 'singles') {
      const p1 = activeForRound[c * 2];
      const p2 = activeForRound[c * 2 + 1];

      matches.push({
        id: generateId(),
        courtNumber: c + 1,
        team1: [p1.id],
        team2: [p2.id],
        team1Score: 0,
        team2Score: 0,
        status: 'pending',
        pointsTarget
      });
    }
  }

  return {
    roundNumber,
    format: 'mexicano',
    gameMode,
    status: 'in_progress',
    matches,
    byes: roundByes,
    createdAt: new Date().toISOString()
  };
}
