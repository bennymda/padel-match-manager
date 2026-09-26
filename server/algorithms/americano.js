import { randomUUID } from 'node:crypto';

/**
 * Americano Match Generation Algorithm
 * Features:
 * - Supports Doubles (4 players/court), Singles (2 players/court), Fixed Partner (2v2)
 * - Minimizes partner duplicates & opponent duplicates across rounds
 * - Balances court distributions so players don't get stuck on the same court
 * - Automatically assigns BYE (rest) rounds fairly based on rest count history
 * - Honors manual resting, injured, or late status
 */

/**
 * Helper to build historical interaction matrices
 */
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
    // Record byes
    (round.byes || []).forEach(pId => {
      initPlayer(pId);
      byeHistory[pId] = (byeHistory[pId] || 0) + 1;
    });

    // Record matches
    (round.matches || []).forEach((match, courtIdx) => {
      const t1 = match.team1 || [];
      const t2 = match.team2 || [];

      [...t1, ...t2].forEach(pId => {
        initPlayer(pId);
        courtHistory[pId][courtIdx] = (courtHistory[pId][courtIdx] || 0) + 1;
      });

      // Partners in Team 1
      for (let i = 0; i < t1.length; i++) {
        for (let j = i + 1; j < t1.length; j++) {
          const p1 = t1[i], p2 = t1[j];
          partnerHistory[p1][p2] = (partnerHistory[p1][p2] || 0) + 1;
          partnerHistory[p2][p1] = (partnerHistory[p2][p1] || 0) + 1;
        }
      }

      // Partners in Team 2
      for (let i = 0; i < t2.length; i++) {
        for (let j = i + 1; j < t2.length; j++) {
          const p1 = t2[i], p2 = t2[j];
          partnerHistory[p1][p2] = (partnerHistory[p1][p2] || 0) + 1;
          partnerHistory[p2][p1] = (partnerHistory[p2][p1] || 0) + 1;
        }
      }

      // Opponents between Team 1 and Team 2
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

/**
 * Generate next round for Americano format
 */
export function generateAmericanoRound({
  players, // Array of player objects { id, name, status: 'active'|'resting'|'late'|'injured', fixedPartnerId? }
  rounds = [], // Previous completed or ongoing rounds
  courtCount = 2,
  gameMode = 'doubles', // 'doubles' | 'singles' | 'fixed_partner'
  pointsTarget = 24
}) {
  const roundNumber = rounds.length + 1;
  const history = buildHistoryMatrix(rounds);

  // Filter available players
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

  // If not enough players to fill even 1 court
  if (totalSlotsNeeded < playersPerCourt) {
    throw new Error(`Minimal ${playersPerCourt} pemain aktif dibutuhkan untuk mode ${gameMode}`);
  }

  // Determine who gets a BYE (rest)
  // Sort players by: 1) manual rest first, 2) fewest byes so far, 3) highest matches played, 4) random
  const numByesNeeded = availablePlayers.length - totalSlotsNeeded;
  let activeForRound = [...availablePlayers];
  let roundByes = [...manuallyResting.map(p => p.id)];

  if (numByesNeeded > 0) {
    // Sort so player with fewest byes is selected to sit out
    activeForRound.sort((a, b) => {
      const byeA = history.byeHistory[a.id] || 0;
      const byeB = history.byeHistory[b.id] || 0;
      if (byeA !== byeB) return byeA - byeB; // fewer byes get chosen to rest first
      return Math.random() - 0.5;
    });

    const chosenToRest = activeForRound.slice(0, numByesNeeded);
    activeForRound = activeForRound.slice(numByesNeeded);
    roundByes.push(...chosenToRest.map(p => p.id));
  }

  const actualCourts = Math.floor(activeForRound.length / playersPerCourt);

  let bestMatches = null;
  let bestScore = Infinity;

  // Run Monte Carlo search to find pairings with minimal repeat partners & opponents
  const iterations = gameMode === 'singles' ? 100 : 400;

  for (let it = 0; it < iterations; it++) {
    // Shuffle active players
    const shuffled = [...activeForRound].sort(() => Math.random() - 0.5);
    const candidateMatches = [];
    let penalty = 0;

    for (let c = 0; c < actualCourts; c++) {
      if (gameMode === 'doubles') {
        const p1 = shuffled[c * 4];
        const p2 = shuffled[c * 4 + 1];
        const p3 = shuffled[c * 4 + 2];
        const p4 = shuffled[c * 4 + 3];

        // Team 1 = p1 & p2, Team 2 = p3 & p4
        // Check partner history
        const pHistory1 = (history.partnerHistory[p1.id]?.[p2.id] || 0);
        const pHistory2 = (history.partnerHistory[p3.id]?.[p4.id] || 0);
        penalty += (pHistory1 * 200) + (pHistory2 * 200);

        // Check opponent history
        const op1 = (history.opponentHistory[p1.id]?.[p3.id] || 0) + (history.opponentHistory[p1.id]?.[p4.id] || 0);
        const op2 = (history.opponentHistory[p2.id]?.[p3.id] || 0) + (history.opponentHistory[p2.id]?.[p4.id] || 0);
        penalty += (op1 + op2) * 20;

        // Court repetition penalty
        [p1, p2, p3, p4].forEach(p => {
          const timesOnCourt = history.courtHistory[p.id]?.[c] || 0;
          penalty += timesOnCourt * 10;
        });

        candidateMatches.push({
          id: randomUUID(),
          courtNumber: c + 1,
          team1: [p1.id, p2.id],
          team2: [p3.id, p4.id],
          team1Score: 0,
          team2Score: 0,
          status: 'pending', // 'pending' | 'in_progress' | 'completed'
          pointsTarget
        });
      } else {
        // Singles (1v1)
        const p1 = shuffled[c * 2];
        const p2 = shuffled[c * 2 + 1];

        const op = (history.opponentHistory[p1.id]?.[p2.id] || 0);
        penalty += op * 100;

        [p1, p2].forEach(p => {
          const timesOnCourt = history.courtHistory[p.id]?.[c] || 0;
          penalty += timesOnCourt * 10;
        });

        candidateMatches.push({
          id: randomUUID(),
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
      if (penalty === 0) break; // Perfect round found!
    }
  }

  return {
    roundNumber,
    format: 'americano',
    gameMode,
    status: 'in_progress', // 'in_progress' | 'completed'
    matches: bestMatches,
    byes: roundByes,
    createdAt: new Date().toISOString()
  };
}

/**
 * Handle Fixed Partner Americano round generation
 */
function generateFixedPartnerRound({
  availablePlayers,
  manuallyResting,
  rounds,
  courtCount,
  history,
  roundNumber,
  pointsTarget
}) {
  // Group players into fixed pairs
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

  // Any players without fixed partner pair up sequentially
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

  // Remaining odd player gets bye
  availablePlayers.forEach(p => {
    if (!visited.has(p.id)) byePlayerIds.push(p.id);
  });

  if (numByesPairs > 0) {
    // Sort pairs by least byes
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

  for (let it = 0; it < 200; it++) {
    const shuffledPairs = [...activePairs].sort(() => Math.random() - 0.5);
    let penalty = 0;
    const candidateMatches = [];

    for (let c = 0; c < maxCourts; c++) {
      const team1 = shuffledPairs[c * 2];
      const team2 = shuffledPairs[c * 2 + 1];

      // Check opponent history
      team1.forEach(p1 => {
        team2.forEach(p2 => {
          penalty += (history.opponentHistory[p1]?.[p2] || 0) * 50;
        });
      });

      candidateMatches.push({
        id: randomUUID(),
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
