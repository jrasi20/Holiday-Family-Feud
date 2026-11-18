import assert from "node:assert/strict";
import test from "node:test";
import { createPresence, roomStatus, setPlayerPresence } from "../src/game-state.js";

const teams = [
  { name: "Team Bethlehem", players: ["A1","A2","A3","A4","A5"] },
  { name: "Team Nazareth", players: ["B1","B2","B3","B4","B5"] }
];

test("party room remains locked until all ten players are present and ready", () => {
  let room = createPresence(teams, "Party");
  assert.equal(roomStatus(room, "Party").canStart, false);
  for (const player of room.slice(0,9)) room = setPlayerPresence(room, player.id, { present: true, ready: true });
  assert.deepEqual(roomStatus(room, "Party"), { expected: 10, present: 9, ready: 9, canStart: false });
  room = setPlayerPresence(room, room[9].id, { present: true, ready: true });
  assert.deepEqual(roomStatus(room, "Party"), { expected: 10, present: 10, ready: 10, canStart: true });
});

test("solo room is immediately ready with exactly one participant", () => {
  const room = createPresence(teams, "Solo");
  assert.equal(room.length, 1);
  assert.deepEqual(roomStatus(room, "Solo"), { expected: 1, present: 1, ready: 1, canStart: true });
});

test("500 full ten-player rooms can check in together without cross-room state", async () => {
  const started = performance.now();
  const results = await Promise.all(Array.from({ length: 500 }, async (_, roomIndex) => {
    let room = createPresence(teams, "Party");
    const arrivals = room.map(player => Promise.resolve({ roomIndex, id: player.id }));
    for (const arrival of await Promise.all(arrivals)) {
      room = setPlayerPresence(room, arrival.id, { present: true, ready: true });
    }
    return roomStatus(room, "Party");
  }));
  assert.ok(results.every(result => result.canStart && result.ready === 10));
  assert.ok(performance.now() - started < 1000, "presence simulation should remain responsive");
});
