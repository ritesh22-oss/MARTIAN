/**
 * A* Pathfinding Algorithm Module for MarsNav Rover Navigation
 * Calculates optimal paths on a cost grid considering terrain slope and obstacles.
 */

export class AStarGrid {
  constructor(width = 30, height = 20) {
    this.width = width;
    this.height = height;
    this.resetGrid();
  }

  resetGrid() {
    // 0: Free/Safe, 1: Sand/Slip, 2: Boulder/Hazard, 3: Impassable Wall/Crater
    this.grid = Array(this.height).fill(0).map(() => Array(this.width).fill(0));
    // Add some default procedural obstacles (craters/rocks)
    for (let y = 5; y < 10; y++) {
      this.grid[y][10] = 3;
      this.grid[y][11] = 3;
    }
    for (let y = 2; y < 7; y++) {
      this.grid[y][20] = 2;
    }
    for (let x = 14; x < 18; x++) {
      this.grid[12][x] = 2;
    }
    this.start = { x: 2, y: 10 };
    this.goal = { x: 27, y: 10 };
  }

  setObstacle(x, y, type = 3) {
    if (x === this.start.x && y === this.start.y) return;
    if (x === this.goal.x && y === this.goal.y) return;
    this.grid[y][x] = this.grid[y][x] === type ? 0 : type;
  }

  setStart(x, y) {
    if (this.grid[y][x] >= 2) return false;
    this.start = { x, y };
    return true;
  }

  setGoal(x, y) {
    if (this.grid[y][x] >= 2) return false;
    this.goal = { x, y };
    return true;
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getCost(x, y) {
    const cell = this.grid[y][x];
    if (cell === 3) return Infinity; // Impassable
    if (cell === 2) return 5.0;     // Boulder / High risk
    if (cell === 1) return 2.0;     // Soft sand / Slip risk
    return 1.0;                     // Smooth bedrock
  }

  findPath() {
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();

    const gScore = new Map();
    const fScore = new Map();

    const key = (node) => `${node.x},${node.y}`;

    gScore.set(key(this.start), 0);
    fScore.set(key(this.start), this.heuristic(this.start, this.goal));

    openSet.push({ ...this.start, f: fScore.get(key(this.start)) });

    let exploredCount = 0;
    const exploredNodes = [];

    while (openSet.length > 0) {
      // Sort openSet by lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currentKey = key(current);

      if (current.x === this.goal.x && current.y === this.goal.y) {
        // Reconstruct path
        const path = [];
        let curr = current;
        while (cameFrom.has(key(curr))) {
          path.unshift({ x: curr.x, y: curr.y });
          curr = cameFrom.get(key(curr));
        }
        path.unshift({ x: this.start.x, y: this.start.y });

        let totalCost = 0;
        for (let i = 1; i < path.length; i++) {
          totalCost += this.getCost(path[i].x, path[i].y);
        }

        return {
          success: true,
          path,
          exploredNodes,
          exploredCount: exploredNodes.length,
          totalCost: Math.round(totalCost * 10) / 10,
          steps: path.length
        };
      }

      closedSet.add(currentKey);
      exploredNodes.push({ x: current.x, y: current.y });
      exploredCount++;

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.x >= this.width || neighbor.y < 0 || neighbor.y >= this.height) {
          continue;
        }
        const neighborKey = key(neighbor);
        if (closedSet.has(neighborKey)) continue;

        const terrainCost = this.getCost(neighbor.x, neighbor.y);
        if (terrainCost === Infinity) continue;

        const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + terrainCost;

        if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, { x: current.x, y: current.y });
          gScore.set(neighborKey, tentativeGScore);
          const f = tentativeGScore + this.heuristic(neighbor, this.goal);
          fScore.set(neighborKey, f);

          if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
            openSet.push({ x: neighbor.x, y: neighbor.y, f });
          }
        }
      }
    }

    return {
      success: false,
      path: [],
      exploredNodes,
      exploredCount: exploredNodes.length,
      totalCost: 0,
      steps: 0
    };
  }
}
