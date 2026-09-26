/**
 * Padel Matchmaking Rating (MMR) Engine
 * Adapted from Elo / Bayesian rating for doubles and singles padel.
 */

export const DEFAULT_MMR = 1200;

export const SKILL_LEVEL_MMR = {
  beginner: 1000,
  intermediate: 1200,
  advanced: 1450,
  pro: 1700
};

/**
 * Calculate expected score probability between two ratings.
 * P(A wins point) = 1 / (1 + 10^((RatingB - RatingA) / 400))
 */
export function getExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Update player MMRs after a match.
 * @param {Array<{id: string, mmr: number, matchesPlayed?: number}>} team1Players
 * @param {Array<{id: string, mmr: number, matchesPlayed?: number}>} team2Players
 * @param {number} team1Score
 * @param {number} team2Score
 * @returns {Object} Map of playerId => { oldMMR, newMMR, delta }
 */
export function calculateMatchMMR(team1Players, team2Players, team1Score, team2Score) {
  const totalScore = team1Score + team2Score;
  if (totalScore === 0) {
    // No points played yet or draw 0-0
    const results = {};
    [...team1Players, ...team2Players].forEach(p => {
      results[p.id] = { oldMMR: p.mmr || DEFAULT_MMR, newMMR: p.mmr || DEFAULT_MMR, delta: 0 };
    });
    return results;
  }

  // Average team MMR
  const t1AvgMMR = team1Players.reduce((sum, p) => sum + (p.mmr || DEFAULT_MMR), 0) / team1Players.length;
  const t2AvgMMR = team2Players.reduce((sum, p) => sum + (p.mmr || DEFAULT_MMR), 0) / team2Players.length;

  const expected1 = getExpectedScore(t1AvgMMR, t2AvgMMR);
  const expected2 = 1 - expected1;

  // Actual point ratio
  const actual1 = team1Score / totalScore;
  const actual2 = team2Score / totalScore;

  const results = {};

  // Update Team 1
  team1Players.forEach(player => {
    const oldMMR = player.mmr || DEFAULT_MMR;
    // K-factor: higher for fewer matches played for faster convergence
    const matches = player.matchesPlayed || 0;
    const K = matches < 5 ? 40 : matches < 15 ? 32 : 24;
    
    // Performance delta based on expected vs actual point ratio + win/loss bonus
    const winBonus = team1Score > team2Score ? 4 : team1Score < team2Score ? -4 : 0;
    const rawDelta = Math.round(K * (actual1 - expected1) * 2 + winBonus);
    
    // Cap single match delta
    const delta = Math.max(-50, Math.min(50, rawDelta));
    const newMMR = Math.max(500, oldMMR + delta);

    results[player.id] = {
      oldMMR,
      newMMR,
      delta
    };
  });

  // Update Team 2
  team2Players.forEach(player => {
    const oldMMR = player.mmr || DEFAULT_MMR;
    const matches = player.matchesPlayed || 0;
    const K = matches < 5 ? 40 : matches < 15 ? 32 : 24;
    
    const winBonus = team2Score > team1Score ? 4 : team2Score < team1Score ? -4 : 0;
    const rawDelta = Math.round(K * (actual2 - expected2) * 2 + winBonus);
    
    const delta = Math.max(-50, Math.min(50, rawDelta));
    const newMMR = Math.max(500, oldMMR + delta);

    results[player.id] = {
      oldMMR,
      newMMR,
      delta
    };
  });

  return results;
}
