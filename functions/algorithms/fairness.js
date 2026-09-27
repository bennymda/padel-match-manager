import { calculateMatchMMR, DEFAULT_MMR, SKILL_LEVEL_MMR } from './mmr.js';

export function calculateLeaderboard(tournament) {
  const { players = [], rounds = [] } = tournament;

  const stats = {};
  players.forEach(p => {
    stats[p.id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar || null,
      status: p.status || 'active',
      skillLevel: p.skillLevel || 'intermediate',
      initialMMR: p.initialMMR || SKILL_LEVEL_MMR[p.skillLevel] || DEFAULT_MMR,
      currentMMR: p.initialMMR || SKILL_LEVEL_MMR[p.skillLevel] || DEFAULT_MMR,
      mmrHistory: [p.initialMMR || SKILL_LEVEL_MMR[p.skillLevel] || DEFAULT_MMR],
      matchesPlayed: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      pointsWon: p.startingPoints || 0,
      pointsConceded: 0,
      pointDifferential: p.startingPoints || 0,
      pointsPerMatch: 0,
      winRate: 0,
      byesCount: 0,
      joinedRound: p.joinedRound || 1,
      substitutedBy: p.substitutedBy || null,
      isSubstitute: p.isSubstitute || false,
    };
  });

  rounds.forEach(r => {
    (r.byes || []).forEach(pId => {
      if (stats[pId]) {
        stats[pId].byesCount += 1;
      }
    });
  });

  rounds.forEach(round => {
    (round.matches || []).forEach(match => {
      if (match.status === 'completed' || (match.team1Score > 0 || match.team2Score > 0)) {
        const s1 = Number(match.team1Score) || 0;
        const s2 = Number(match.team2Score) || 0;

        const t1Players = (match.team1 || []).map(id => stats[id]).filter(Boolean);
        const t2Players = (match.team2 || []).map(id => stats[id]).filter(Boolean);

        t1Players.forEach(p => {
          p.matchesPlayed += 1;
          p.pointsWon += s1;
          p.pointsConceded += s2;
          p.pointDifferential += (s1 - s2);
          if (s1 > s2) p.matchesWon += 1;
          else if (s1 < s2) p.matchesLost += 1;
          else p.matchesDrawn += 1;
        });

        t2Players.forEach(p => {
          p.matchesPlayed += 1;
          p.pointsWon += s2;
          p.pointsConceded += s1;
          p.pointDifferential += (s2 - s1);
          if (s2 > s1) p.matchesWon += 1;
          else if (s2 < s1) p.matchesLost += 1;
          else p.matchesDrawn += 1;
        });

        const mmrChanges = calculateMatchMMR(
          t1Players.map(p => ({ id: p.id, mmr: p.currentMMR, matchesPlayed: p.matchesPlayed })),
          t2Players.map(p => ({ id: p.id, mmr: p.currentMMR, matchesPlayed: p.matchesPlayed })),
          s1,
          s2
        );

        Object.entries(mmrChanges).forEach(([pId, mmrData]) => {
          if (stats[pId]) {
            stats[pId].currentMMR = mmrData.newMMR;
            stats[pId].mmrHistory.push(mmrData.newMMR);
          }
        });
      }
    });
  });

  const standings = Object.values(stats).map(p => {
    const ppr = p.matchesPlayed > 0 ? (p.pointsWon / p.matchesPlayed) : 0;
    const wr = p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0;
    const mmrDelta = p.currentMMR - p.initialMMR;

    return {
      ...p,
      pointsPerMatch: Number(ppr.toFixed(1)),
      winRate: wr,
      mmrDelta
    };
  });

  standings.sort((a, b) => {
    if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
    if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
    if (b.pointsPerMatch !== a.pointsPerMatch) return b.pointsPerMatch - a.pointsPerMatch;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return b.currentMMR - a.currentMMR;
  });

  standings.forEach((player, idx) => {
    player.rank = idx + 1;
  });

  return standings;
}

export function addPlayerMidMatch(tournament, playerInput, options = {}) {
  const currentRound = tournament.rounds.length;
  const currentLeaderboard = calculateLeaderboard(tournament);

  let startingPoints = 0;
  if (options.pointMode === 'average' && currentLeaderboard.length > 0 && currentRound > 0) {
    const totalPts = currentLeaderboard.reduce((s, p) => s + p.pointsWon, 0);
    const avgPts = Math.round(totalPts / currentLeaderboard.length);
    startingPoints = avgPts;
  } else if (typeof options.customPoints === 'number') {
    startingPoints = options.customPoints;
  }

  const initialMMR = playerInput.initialMMR || SKILL_LEVEL_MMR[playerInput.skillLevel || 'intermediate'] || DEFAULT_MMR;

  const newPlayer = {
    id: playerInput.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: playerInput.name.trim(),
    avatar: playerInput.avatar || null,
    skillLevel: playerInput.skillLevel || 'intermediate',
    status: 'active',
    joinedRound: currentRound + 1,
    startingPoints,
    initialMMR,
    mmr: initialMMR,
    fixedPartnerId: playerInput.fixedPartnerId || null
  };

  tournament.players.push(newPlayer);
  return newPlayer;
}

export function substitutePlayer(tournament, originalPlayerId, subInput, options = {}) {
  const originalPlayer = tournament.players.find(p => p.id === originalPlayerId);
  if (!originalPlayer) throw new Error('Player to substitute not found');

  const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const subPlayer = {
    id: subId,
    name: subInput.name.trim(),
    avatar: subInput.avatar || null,
    skillLevel: subInput.skillLevel || originalPlayer.skillLevel || 'intermediate',
    status: 'active',
    joinedRound: tournament.rounds.length + 1,
    isSubstitute: true,
    substitutingFor: originalPlayer.id,
    startingPoints: options.keepPoints ? (originalPlayer.startingPoints || 0) : 0,
    initialMMR: subInput.initialMMR || originalPlayer.mmr || DEFAULT_MMR,
    mmr: subInput.initialMMR || originalPlayer.mmr || DEFAULT_MMR
  };

  originalPlayer.status = 'injured';
  originalPlayer.substitutedBy = subId;

  if (options.applyToCurrentRound && tournament.rounds.length > 0) {
    const currentRound = tournament.rounds[tournament.rounds.length - 1];
    if (currentRound.status === 'in_progress') {
      currentRound.matches.forEach(match => {
        if (match.status !== 'completed') {
          const idx1 = match.team1.indexOf(originalPlayerId);
          if (idx1 !== -1) match.team1[idx1] = subId;
          const idx2 = match.team2.indexOf(originalPlayerId);
          if (idx2 !== -1) match.team2[idx2] = subId;
        }
      });
    }
  }

  tournament.players.push(subPlayer);
  return subPlayer;
}
