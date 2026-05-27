/**
 * HouseEconomy — Task 100 (House 拆分)
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Player/PlayerResources.cs`
 *
 * 管理阵营的经济数据：Cash、Resources、Capacity、收支统计。
 */

export class HouseEconomy {
  credits = 0;
  tiberium = 0;
  capacity = 0;
  creditsSpent = 0;
  harvestedCredits = 0;
  stolenBuildingsCredits = 0;

  constructor(options?: { credits?: number; tiberium?: number; capacity?: number }) {
    this.credits = options?.credits ?? 0;
    this.tiberium = options?.tiberium ?? 0;
    this.capacity = options?.capacity ?? 0;
  }

  /** 增加资金（收入、矿车卸货）。 */
  addCredits(amount: number): void {
    this.credits += amount;
    this.harvestedCredits += amount;
  }

  /**
   * 尝试花费资金。
   * @returns 是否成功扣除（余额不足时返回 false，不扣款）。
   */
  spendCredits(amount: number): boolean {
    if (this.credits < amount) return false;
    this.credits -= amount;
    this.creditsSpent += amount;
    return true;
  }

  /** 增加矿石储量（矿车卸货时），不超过容量上限。 */
  giveResources(amount: number): number {
    const available = this.capacity - this.tiberium;
    const actual = Math.min(amount, available);
    this.tiberium += actual;
    return actual;
  }

  /** 将矿石转化为资金（精炼），返回实际转化量。 */
  refineResources(rate: number): number {
    const amount = Math.min(rate, this.tiberium);
    this.tiberium -= amount;
    this.credits += amount;
    return amount;
  }

  /**
   * 双轨花费：先扣 Resources（矿石），不足再扣 Cash。
   * @returns 是否成功扣除。
   */
  takeCash(amount: number): boolean {
    if (amount <= 0) return true;
    const fromResources = Math.min(amount, this.tiberium);
    const remaining = amount - fromResources;
    if (this.credits < remaining) return false;
    this.tiberium -= fromResources;
    this.credits -= remaining;
    this.creditsSpent += amount;
    return true;
  }

  /** 查看当前总购买力（cash + resources）。 */
  getTotalSpendable(): number {
    return this.credits + this.tiberium;
  }
}
