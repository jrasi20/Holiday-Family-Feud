export const ROOM_SIZE = 10;

export function createPresence(teams, mode = "Party") {
  if (mode === "Solo") {
    return [{ id: "solo-0", team: 0, seat: 0, name: teams[0].players[0] || "Solo Player", present: true, ready: true }];
  }
  return teams.flatMap((team, teamIndex) => team.players.map((name, seat) => ({
    id: `${teamIndex}-${seat}`,
    team: teamIndex,
    seat,
    name: name || `Player ${seat + 1}`,
    present: false,
    ready: false
  })));
}

export function setPlayerPresence(presence, id, patch) {
  return presence.map(player => player.id === id ? { ...player, ...patch } : player);
}

export function roomStatus(presence, mode = "Party") {
  const expected = mode === "Solo" ? 1 : ROOM_SIZE;
  const present = presence.filter(player => player.present).length;
  const ready = presence.filter(player => player.present && player.ready).length;
  return { expected, present, ready, canStart: presence.length === expected && ready === expected };
}
