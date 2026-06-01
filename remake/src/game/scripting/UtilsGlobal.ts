/**
 * UtilsGlobal — CAM-5
 *
 * 脚本工具函数：遍历、随机选择、过滤、存在检查。
 * OpenRA 对标: OpenRA.Mods.Common/Scripting/Global/UtilsGlobal.cs
 */

export class UtilsGlobal {
  /** 遍历数组或对象，对每个元素执行回调。 */
  Do<T>(table: T[] | Record<string, T>, func: (item: T) => void): void {
    if (Array.isArray(table)) {
      for (const item of table) {
        func(item);
      }
    } else {
      for (const key of Object.keys(table)) {
        func(table[key]);
      }
    }
  }

  /** 从数组中随机选择一个元素。 */
  Random<T>(table: T[] | Record<string, T>): T | null {
    const arr = Array.isArray(table) ? table : Object.values(table);
    if (arr.length === 0) return null;
    const idx = Math.floor(Math.random() * arr.length);
    return arr[idx];
  }

  /** 过滤数组，返回满足条件的元素数组。 */
  Where<T>(table: T[] | Record<string, T>, predicate: (item: T) => boolean): T[] {
    const arr = Array.isArray(table) ? table : Object.values(table);
    return arr.filter(predicate);
  }

  /** 检查数组中是否有元素满足条件。 */
  Any<T>(table: T[] | Record<string, T>, predicate: (item: T) => boolean): boolean {
    const arr = Array.isArray(table) ? table : Object.values(table);
    return arr.some(predicate);
  }
}
