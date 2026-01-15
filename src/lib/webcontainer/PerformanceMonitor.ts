/**
 * 性能监控器
 * 收集和分析 WebContainer 操作的性能指标
 */

import type { BootMetrics } from './types';

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private timers: Map<string, number> = new Map();
  private metrics: BootMetrics[] = [];
  private currentMetrics: Partial<BootMetrics> = {};

  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      console.warn(`Timer "${name}" was not started`);
      return 0;
    }

    const elapsed = performance.now() - startTime;
    this.timers.delete(name);
    return Math.round(elapsed);
  }

  recordBootTime(time: number): void {
    this.currentMetrics.bootTime = time;
  }

  recordMountTime(time: number): void {
    this.currentMetrics.mountTime = time;
  }

  recordInstallTime(time: number): void {
    this.currentMetrics.installTime = time;
  }

  recordServerReadyTime(time: number): void {
    this.currentMetrics.serverReadyTime = time;
  }

  recordCacheHit(hit: boolean): void {
    this.currentMetrics.cacheHit = hit;
  }

  finishMetrics(): BootMetrics {
    const metrics: BootMetrics = {
      bootTime: this.currentMetrics.bootTime ?? 0,
      mountTime: this.currentMetrics.mountTime ?? 0,
      installTime: this.currentMetrics.installTime ?? 0,
      serverReadyTime: this.currentMetrics.serverReadyTime ?? 0,
      totalTime: 0,
      cacheHit: this.currentMetrics.cacheHit ?? false,
    };

    metrics.totalTime = metrics.bootTime + metrics.mountTime + metrics.installTime + metrics.serverReadyTime;

    this.metrics.push(metrics);
    this.currentMetrics = {};

    return metrics;
  }

  /**
   * 获取所有历史度量
   */
  getAllMetrics(): BootMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取平均度量
   */
  getAverageMetrics(): BootMetrics | null {
    if (this.metrics.length === 0) return null;

    const sum = this.metrics.reduce(
      (acc, m) => ({
        bootTime: acc.bootTime + m.bootTime,
        mountTime: acc.mountTime + m.mountTime,
        installTime: acc.installTime + m.installTime,
        serverReadyTime: acc.serverReadyTime + m.serverReadyTime,
        totalTime: acc.totalTime + m.totalTime,
        cacheHit: acc.cacheHit,
      }),
      { bootTime: 0, mountTime: 0, installTime: 0, serverReadyTime: 0, totalTime: 0, cacheHit: false }
    );

    const count = this.metrics.length;
    return {
      bootTime: Math.round(sum.bootTime / count),
      mountTime: Math.round(sum.mountTime / count),
      installTime: Math.round(sum.installTime / count),
      serverReadyTime: Math.round(sum.serverReadyTime / count),
      totalTime: Math.round(sum.totalTime / count),
      cacheHit: this.metrics.filter(m => m.cacheHit).length > count / 2,
    };
  }

  /**
   * 获取最近一次度量
   */
  getLastMetrics(): BootMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No metrics recorded yet.';
    }

    const avg = this.getAverageMetrics()!;
    const last = this.getLastMetrics()!;
    const cacheHitRate = (this.metrics.filter(m => m.cacheHit).length / this.metrics.length * 100).toFixed(1);

    return `
WebContainer Performance Report
===============================
Total sessions: ${this.metrics.length}
Cache hit rate: ${cacheHitRate}%

Average Metrics:
  Boot time:          ${avg.bootTime}ms
  Mount time:         ${avg.mountTime}ms
  Install time:       ${avg.installTime}ms
  Server ready time:  ${avg.serverReadyTime}ms
  Total time:         ${avg.totalTime}ms

Last Session:
  Boot time:          ${last.bootTime}ms
  Mount time:         ${last.mountTime}ms
  Install time:       ${last.installTime}ms
  Server ready time:  ${last.serverReadyTime}ms
  Total time:         ${last.totalTime}ms
  Cache hit:          ${last.cacheHit ? 'Yes' : 'No'}
`.trim();
  }

  reset(): void {
    this.timers.clear();
    this.metrics = [];
    this.currentMetrics = {};
  }
}

let monitorInstance: PerformanceMonitor | null = null;

/**
 * 获取性能监控器单例
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}
