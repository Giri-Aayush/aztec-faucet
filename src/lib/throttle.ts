export class ThrottleError extends Error {
  /** Milliseconds until the next drip is allowed */
  retryAfter: number;

  constructor(asset: string, retryAfter: number) {
    super(`You've already requested ${asset} recently. Please try again later.`);
    this.retryAfter = retryAfter;
  }
}

export class Throttle {
  /** address → asset → last drip timestamp */
  private history = new Map<string, Map<string, number>>();

  constructor(
    private intervalMs: number,
    private timeFn: () => number = Date.now,
  ) {}

  check(address: string, asset: string): void {
    const assetHistory = this.history.get(address);
    if (!assetHistory) return;

    const last = assetHistory.get(asset);
    if (typeof last !== "number") return;

    const now = this.timeFn();
    const elapsed = now - last;
    if (elapsed < this.intervalMs) {
      throw new ThrottleError(asset, this.intervalMs - elapsed);
    }
  }

  record(address: string, asset: string): void {
    if (!this.history.has(address)) {
      this.history.set(address, new Map());
    }
    this.history.get(address)!.set(asset, this.timeFn());
  }
}
