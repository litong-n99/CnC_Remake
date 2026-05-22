/**
 * 快速验证 Task 23.7 地形缝隙寻路行为。
 *
 * 用法: npx tsx scripts/test-rock-gap.ts
 */

import { Pathfinder } from '../src/game/terrain/Pathfinder';
import { LandType } from '../src/game/terrain/TerrainGrid';
import { getLocomotor, makeTerrainCostCallback } from '../src/game/rules/Locomotor';
import { Locomotion } from '../src/game/rules/UnitDefinitions';

// 模拟地形：64x64 地图，中间 y=22-23, x=24-36 是完整的 Rock 墙
function getTerrainType(x: number, y: number): LandType {
  if (y === 22 || y === 23) {
    if (x >= 24 && x <= 36) {
      return LandType.Rock;
    }
  }
  return LandType.Clear;
}

// isPassable：只拒绝 Water
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isPassable(_x: number, _y: number): boolean {
  return true;
}

const pathfinder = new Pathfinder(64, 64, isPassable, undefined, getTerrainType);

// 获取两种 Locomotor
const footLocomotor = getLocomotor(Locomotion.Foot);
const trackLocomotor = getLocomotor(Locomotion.Track);

const footCost = makeTerrainCostCallback(footLocomotor, getTerrainType);
const trackCost = makeTerrainCostCallback(trackLocomotor, getTerrainType);

// 测试路径
const startLeft = { x: 25, y: 20 };
const endRight = { x: 35, y: 24 };

console.log('=== Task 23.7 Rock Gap Verification ===\n');

// 1. 步兵路径（应该穿过缝隙）
const footPath = pathfinder.findPath(
  startLeft.x,
  startLeft.y,
  endRight.x,
  endRight.y,
  undefined,
  undefined,
  0,
  false,
  footCost
);

console.log('Foot (Infantry) path:');
if (footPath) {
  console.log('  Length:', footPath.length);
  console.log('  Path:', footPath.map((p) => `(${p.x},${p.y})`).join(' -> '));

  // 检查是否穿过缝隙
  const throughGap = footPath.some((p) => p.x === 30 && (p.y === 22 || p.y === 23));
  console.log('  Through gap (30,22/23):', throughGap ? 'YES ✅' : 'NO ❌');
} else {
  console.log('  NO PATH FOUND ❌');
}

console.log('');

// 2. 坦克路径（应该绕路）
const trackPath = pathfinder.findPath(
  startLeft.x,
  startLeft.y,
  endRight.x,
  endRight.y,
  undefined,
  undefined,
  0,
  false,
  trackCost
);

console.log('Track (Tank) path:');
if (trackPath) {
  console.log('  Length:', trackPath.length);
  console.log('  Path:', trackPath.map((p) => `(${p.x},${p.y})`).join(' -> '));

  // 检查是否穿过缝隙
  const throughGap = trackPath.some((p) => p.x === 30 && (p.y === 22 || p.y === 23));
  console.log('  Through gap (30,22/23):', throughGap ? 'YES ❌ (should NOT)' : 'NO ✅ (correctly routed around)');
} else {
  console.log('  NO PATH FOUND ❌');
}

console.log('');

// 3. 地形代价验证
console.log('Terrain cost at gap (30,22):');
console.log('  Foot:', footCost(30, 22), '(should be 1 = Clear)');
console.log('  Track:', trackCost(30, 22), '(should be 1 = Clear)');

console.log('\nTerrain cost at rock wall (29,22):');
console.log('  Foot:', footCost(29, 22), '(should be 0.5)');
console.log('  Track:', trackCost(29, 22), '(should be 0 = blocked)');

console.log('\n=== Verification Complete ===');
