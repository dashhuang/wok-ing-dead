var FIELD_SETS = {
  fstand: (A) => [() => bleacher(1, { atlas: A })],
  fpress: (A) => [() => pressBox(1, { atlas: A })],
  fmast: (A) => [() => floodMast(1, { atlas: A, on: 2 }), () => floodMast(2, { atlas: A, on: 0 })],
  fheli: (A) => [() => helicopter(1, { atlas: A })],
  fhall: (A) => [() => sportsHall(1, { atlas: A })],
  fblock: (A) => [() => changingBlock(1, { atlas: A }), () => doorLeaf(1, { w: 1, open: 1.2 })],
  fbus: (A) => [() => schoolBus(3, { atlas: A, no: 2, lights: 1, hazard: 1, dome: 1, arm: 1, smash: 0.15 }), () => schoolBus(2, { atlas: A, no: 1, smash: 0.5, flat: [0, 2], hood: 0.95, graf: "gNoBuses" })],
  ftruck: (A) => [() => armyTruck(1, { atlas: A, gate: 1, lights: 1 }), () => armyTruck(2, { atlas: A, canvas: "half", cargo: "seats", door: 0.2 })],
  ftent: (A) => [() => fieldTent(1, { atlas: A, w: 10, d: 6, h: 3.1, sides: { e: [[0, 1.6, "c"], [1.6, 4.4, "d"], [4.4, 6, "c"]], w: [[0, 1.6, "c"], [1.6, 4.4, "o"], [4.4, 6, "c"]], n: [[0, 2.5, "c"], [2.5, 5, "w"], [5, 7.5, "o"], [7.5, 10, "c"]], s: [[0, 2.5, "w"], [2.5, 5, "o"], [5, 7.5, "c"], [7.5, 10, "w"]] }, sign: { side: "e", name: "triage", w: 2 }, lamps: [[-2.6, 0, 1], [2.4, 0, 2]] })],
  fmed: (A) => [() => cot(1, { state: "body", atlas: A }), () => cot(2, { state: "used" }), () => cot(3, { state: "tipped" }), () => dripStand(1, { atlas: A }), () => stretcher(1, { trolley: 1, load: "bag", atlas: A }), () => bodyBag2(1, { atlas: A }), () => supplyStack(1, { atlas: A }), () => oxygenCart(1, { loose: 1 }), () => wardScreen(1, { blood: 1 }), () => triageDesk(1, { atlas: A, lamp: 1 }), () => monitorCart(1), () => wheelchair(1), () => wasteBins(1, { atlas: A })],
  // M3 dressing sets (fg_sport, fg_camp, fg_services, fg_nature, fg_backdrop). F is the foliage sheet.
  fsport: (A) => [() => goal(1, { net: "torn" }), () => scoreboard(1, { atlas: A, lit: 1 }), () => dugout(1, { atlas: A, name: "home", lamp: 1 }), () => adBoard(1, { atlas: A, name: "sp0" }), () => adBoard(2, { atlas: A, name: "sp3", state: "lean" }), () => cornerFlag(2, { lean: 0.3 }), () => trainingKit(1), () => kickWall(1, { n: 4, down: [2] }), () => bench2(1), () => lineMarker(1), () => roller(1), () => barrow(1)],
  fcamp: (A) => [() => lightTower2(1, { atlas: A, on: 1 }), () => tripodLamp(1, { on: 1 }), () => generator(1, { atlas: A, on: 1 }), () => distBoard(1, { atlas: A, on: 1 }), () => bagWall(1, { len: 2.6, rows: 4 }), () => crowdBarrier2(1, { atlas: A, n: 3, down: [2], tape: 1, sign: "register" }), () => duckboard(1, { n: 4, sunk: [1] }), () => waySign(1, { atlas: A, name: "wayReg", name2: "wayTriage" }), () => boomGate2(1, { atlas: A, len: 5, up: 0.5, lamp: 1 }), () => tapeLine(1, { atlas: A, len: 6, snap: 0.7 })],
  fserv: (A) => [() => fieldKitchen(1, { atlas: A, lamp: 1, spill: 1 }), () => waterBowser(1, { atlas: A }), () => portaLoo(1, { atlas: A, n: 3, open: [1], tags: "gSorry", lamp: 1 }), () => shed(1, { atlas: A, lamp: 1 }), () => euroBin(1, { atlas: A, lid: 0.9, bags: 6 }), () => bikeRack(1, { n: 5, roof: 1, bikes: [[0, 1, 0], [2, -1, 1], [4, 1, 3]] }), () => noticeBoard(1, { atlas: A, candles: 7 }), () => busShelter2(1, { atlas: A, lit: 1, smash: [0] }), () => parkLamp(1, { atlas: A, on: 1, twin: 1, sign: "speed5" }), () => heightBar(1, { atlas: A, w: 5, hit: 1 })],
  fnature: (A, F2) => [() => tree(1, { sheet: F2, h: 11, kind: "leaf" }), () => tree(2, { sheet: F2, h: 9, kind: "bare" }), () => tree(3, { sheet: F2, h: 9.5, kind: "thin" }), () => conifer(1, { sheet: F2, h: 10 }), () => hedge(1, { sheet: F2, len: 6, h: 1.5, gaps: [[2.5, 3.4]] }), () => weeds(1, { sheet: F2, r: 1.2, n: 14, h: 0.8 }), () => ivy(1, { sheet: F2, w: 4, h: 3.3, drape: 1 }), () => deadFall(1, { sheet: F2, len: 5, leaves: 1 })],
  fback: (A) => [() => house(1, { atlas: A, garage: 1, ext: 1, front: [1, 4, 2, 0], back: [0, 3, 1, 5], porchLamp: 1 }), () => house(2, { atlas: A, garage: -1, bay: 1, front: [0, 2, 3, 4], dead: 1 }), () => gardenFence(1, { n: 4, down: [2], trellis: 1 }), () => lockups(1, { atlas: A, n: 4, open: [1], lit: 1, tags: [0, 2] }), () => telegraphPole(1, { lamp: 1, wires: [[-9, 8, 0.4]] }), () => streetBit(1, { atlas: A, kind: "closed" }), () => streetBit(2, { kind: "pillar" }), () => streetBit(3, { kind: "cabinet" }), () => streetBit(4, { kind: "grit" })],
  fschool: (A) => [() => teachingWing(1, { atlas: A, len: 42, tower: 1, entrance: 4, lit: [[2, 1, 1], [7, 2, 2], [9, 0, 1]] })],
  ffar: (A) => [() => slabBlock(1, { lit: [[1, 7], [4, 3], [6, 8]], fire: [5, 6] }), () => pylon(1, { span: 60 }), () => waterTower(1)],
  ffence: (A) => [() => weldPanel(1, { len: 2.5, end: true }), () => weldPanel(2, { len: 2.5, torn: true, end: true }), () => weldFlat(1), () => weldGate(1, {})]
};
function fieldSets(G4, name) {
  const f3 = FIELD_SETS[name];
  if (!f3) return {};
  fieldMaterials(G4);
  return { [name]: f3(G4.fatlas.signs, G4.fatlas.foliage) };
}

