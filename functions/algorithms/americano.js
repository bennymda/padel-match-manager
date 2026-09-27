function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'm_' + Math.random().toString(36).substring(2, 9);
}

export function buildHistoryMatrix(rounds) {
  const partnerHistory = {};
  const opponentHistory = {};
  const courtHistory = {};
  const byeHistory = {};

  const initPlayer = (id) => {
    if (!partnerHistory[id]) partnerHistory[id] = {};
    if (!opponentHistory[id]) opponentHistory[id] = {};
    if (!courtHistory[id]) courtHistory[id] = {};
    if (byeHistory[id] === undefined) byeHistory[id] = 0;
  };

  rounds.forEach((round) => {
    (round.byes || []).forEach(pId => {
      initPlayer(pId);
      byeHistory[pId] = (byeHistory[pId] || 0) + 1;
    });

    (round.matches || []).forEach((match, courtIdx) => {
      const t1 = match.team1 || [];
      const t2 = match.team2 || [];

      [...t1, ...t2].forEach(pId => {
        initPlayer(pId);
        courtHistory[pId][courtIdx] = (courtHistory[pId][courtIdx] || 0) + 1;
      });

      for (let i = 0; i < t1.length; i++) {
        for (let j = i + 1; j < t1.length; j++) {
          const p1 = t1[i], p2 = t1[j];
          partnerHistory[p1][p2] = (partnerHistory[p1][p2] || 0) + 1;
          partnerHistory[p2][p1] = (partnerHistory[p2][p1] || 0) + 1;
        }
      }

      for (let i = 0; i < t2.length; i++) {
        for (let j = i + 1; j < t2.length; j++) {
          const p1 = t2[i], p2 = t2[j];
          partnerHistory[p1][p2] = (partnerHistory[p1][p2] || 0) + 1;
          partnerHistory[p2][p1] = (partnerHistory[p2][p1] || 0) + 1;
        }
      }

      t1.forEach(p1 => {
        t2.forEach(p2 => {
          opponentHistory[p1][p2] = (opponentHistory[p1][p2] || 0) + 1;
          opponentHistory[p2][p1] = (opponentHistory[p2][p1] || 0) + 1;
        });
      });
    });
  });

  return { partnerHistory, opponentHistory, courtHistory, byeHistory };
}

export function generateAmericanoRound({
  players,
  rounds = [],
  courtCount = 2,
  gameMode = 'doubles',
  pointsTarget = 24
}) {
  const roundNumber = rounds.length + 1;
  const history = buildHistoryMatrix(rounds);

  const manuallyResting = players.filter(p => p.status === 'resting' || p.status === 'late' || p.status === 'injured');
  const availablePlayers = players.filter(p => p.status === 'active' || !p.status);

  if (gameMode === 'fixed_partner') {
    return generateFixedPartnerRound({
      availablePlayers,
      manuallyResting,
      rounds,
      courtCount,
      history,
      roundNumber,
      pointsTarget
    });
  }

  const playersPerCourt = gameMode === 'singles' ? 2 : 4;
  const maxActivePlayers = courtCount * playersPerCourt;
  const totalSlotsNeeded = Math.min(availablePlayers.length - (availablePlayers.length % playersPerCourt), maxActivePlayers);

  if (totalSlotsNeeded < playersPerCourt) {
    throw new Error(`Minimal ${playersPerCourt} pemain aktif dibutuhkan untuk mode ${gameMode}`);
  }

  const numByesNeeded = availablePlayers.length - totalSlotsNeeded;
  let activeForRound = [...availablePlayers];
  let roundByes = [...manuallyResting.map(p => p.id)];

  if (numByesNeeded > 0) {
    activeForRound.sort((a, b) => {
      const byeA = history.byeHistory[a.id] || 0;
      const byeB = history.byeHistory[b.id] || 0;
      if (byeA !== byeB) return byeA - byeB;
      return Math.random() - 0.5;
    });

    const chosenToRest = activeForRound.slice(0, numByesNeeded);
    activeForRound = activeForRound.slice(numByesNeeded);
    roundByes.push(...chosenToRest.map(p => p.id));
  }

  const actualCourts = Math.floor(activeForRound.length / playersPerCourt);
  let bestMatches = null;
  let bestScore = Infinity;
  const iterations = gameMode === 'singles' ? 100 : 350;

  for (let it = 0; it < iterations; it++) {
    const shuffled = [...activeForRound].sort(() => Math.random() - 0.5);
    const candidateMatches = [];
    let penalty = 0;

    for (let c = 0; c < actualCourts; c++) {
      if (gameMode === 'doubles') {
        const p1 = shuffled[c * 4];
        const p2 = shuffled[c * 4 + 1];
        const p3 = shuffled[c * 4 + 2];
        const p4 = shuffled[c * 4 + 3];

        const pHistory1 = (history.partnerHistory[p1.id]?.[p2.id] || 0);
        const pHistory2 = (history.partnerHistory[p3.id]?.[p4.id] || 0);
        penalty += (pHistory1 * 200) + (pHistory2 * 200);

        const op1 = (history.opponentHistory[p1.id]?.[p3.id] || 0) + (history.opponentHistory[p1.id]?.[p4.id] || 0);
        const op2 = (history.opponentHistory[p2.id]?.[p3.id] || 0) + (history.opponentHistory[p2.id]?.[p4.id] || 0);
        penalty += (op1 + op2) * 20;

        [p1, p2, p3, p4].forEach(p => {
          const timesOnCourt = history.courtHistory[p.id]?.[c] || 0;
          penalty += timesOnCourt * 10;
        });

        candidateMatches.push({
          id: generateId(),
          courtNumber: c + 1,
          team1: [p1.id, p2.id],
          team2: [p3.id, p4.id],
          team1Score: 0,
          team2Score: 0,
          status: 'pending',
          pointsTarget
        });
      } else {
        const p1 = shuffled[c * 2];
        const p2 = shuffled[c * 2 + 1];

        const op = (history.opponentHistory[p1.id]?.[p2.id] || 0);
        penalty += op * 100;

        [p1, p2].forEach(p => {
          const timesOnCourt = history.courtHistory[p.id]?.[c] || 0;
          penalty += timesOnCourt * 10;
        });

        candidateMatches.push({
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

    if (penalty < bestScore) {
      bestScore = penalty;
      bestMatches = candidateMatches;
      if (penalty === 0) break;
    }
  }

  return {
    roundNumber,
    format: 'americano',
    gameMode,
    status: 'in_progress',
    matches: bestMatches,
    byes: roundByes,
    createdAt: new Date().toISOString()
  };
}

function generateFixedPartnerRound({
  availablePlayers,
  manuallyResting,
  rounds,
  courtCount,
  history,
  roundNumber,
  pointsTarget
}) {
  const pairs = [];
  const visited = new Set();

  availablePlayers.forEach(p => {
    if (visited.has(p.id)) return;
    if (p.fixedPartnerId) {
      const partner = availablePlayers.find(o => o.id === p.fixedPartnerId);
      if (partner) {
        visited.add(p.id);
        visited.add(partner.id);
        pairs.push([p.id, partner.id]);
      }
    }
  });

  const remaining = availablePlayers.filter(p => !visited.has(p.id));
  for (let i = 0; i < remaining.length - 1; i += 2) {
    pairs.push([remaining[i].id, remaining[i + 1].id]);
    visited.add(remaining[i].id);
    visited.add(remaining[i + 1].id);
  }

  const maxCourts = Math.min(courtCount, Math.floor(pairs.length / 2));
  if (maxCourts === 0) {
    throw new Error('Minimal butuh 2 tim / 4 pemain untuk mode Fixed Partner');
  }

  const numPairsNeeded = maxCourts * 2;
  const numByesPairs = pairs.length - numPairsNeeded;

  let activePairs = [...pairs];
  let byePlayerIds = [...manuallyResting.map(p => p.id)];

  availablePlayers.forEach(p => {
    if (!visited.has(p.id)) byePlayerIds.push(p.id);
  });

  if (numByesPairs > 0) {
    activePairs.sort((pairA, pairB) => {
      const byeA = (history.byeHistory[pairA[0]] || 0) + (history.byeHistory[pairA[1]] || 0);
      const byeB = (history.byeHistory[pairB[0]] || 0) + (history.byeHistory[pairB[1]] || 0);
      return byeA - byeB;
    });
    const sittingPairs = activePairs.slice(0, numByesPairs);
    activePairs = activePairs.slice(numByesPairs);
    sittingPairs.forEach(p => byePlayerIds.push(p[0], p[1]));
  }

  let bestMatches = null;
  let bestScore = Infinity;

  for (let it = 0; it < 150; it++) {
    const shuffledPairs = [...activePairs].sort(() => Math.random() - 0.5);
    let penalty = 0;
    const candidateMatches = [];

    for (let c = 0; c < maxCourts; c++) {
      const team1 = shuffledPairs[c * 2];
      const team2 = shuffledPairs[c * 2 + 1];

      team1.forEach(p1 => {
        team2.forEach(p2 => {
          penalty += (history.opponentHistory[p1]?.[p2] || 0) * 50;
        });
      });

      candidateMatches.push({
        id: generateId(),
        courtNumber: c + 1,
        team1,
        team2,
        team1Score: 0,
        team2Score: 0,
        status: 'pending',
        pointsTarget
      });
    }

    if (penalty < bestScore) {
      bestScore = penalty;
      bestMatches = candidateMatches;
      if (penalty === 0) break;
    }
  }

  return {
    roundNumber,
    format: 'americano',
    gameMode: 'fixed_partner',
    status: 'in_progress',
    matches: bestMatches,
    byes: byePlayerIds,
    createdAt: new Date().toISOString()
  };
}
