import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { MinHeap } from '../scheduler/heap/min-heap';
import { TimingWheel } from '../scheduler/timing-wheel/timing-wheel';
import { JobHeapItem } from '../common/interfaces/job-heap-item.interface';

export interface BenchmarkResult {
  heap_insert_ms: number;
  heap_extract_ms: number;
  timing_wheel_insert_ms: number;
  timing_wheel_extract_ms: number;
  heap_memory_mb: number;
  timing_wheel_memory_mb: number;
  total_jobs: number;
  timestamp: string;
}

@Injectable()
export class BenchmarkService {
  private latestResult: BenchmarkResult | null = null;

  async runBenchmark(count: number): Promise<BenchmarkResult> {
    const items: JobHeapItem[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const priority = Math.floor(Math.random() * 5) + 1;
      const isScheduled = Math.random() > 0.5;
      const scheduledAt = isScheduled
        ? new Date(now.getTime() + Math.random() * 3600000)
        : null;
      items.push({
        id: crypto.randomUUID(),
        priority,
        effectivePriority: priority,
        createdAt: now,
        scheduledAt,
        recurrenceInterval: null,
      });
    }

    // MinHeap benchmark
    const heap = new MinHeap();
    const heapMemBefore = process.memoryUsage().heapUsed;
    const heapInsertStart = performance.now();
    for (const item of items) {
      heap.insert(item);
    }
    const heapInsertEnd = performance.now();
    const heapMemAfter = process.memoryUsage().heapUsed;

    const heapExtractStart = performance.now();
    while (heap.size > 0) {
      heap.extractMin();
    }
    const heapExtractEnd = performance.now();

    // TimingWheel benchmark
    const wheel = new TimingWheel(3600);
    const wheelMemBefore = process.memoryUsage().heapUsed;

    const wheelInsertStart = performance.now();
    for (const item of items) {
      const delayMs = item.scheduledAt
        ? item.scheduledAt.getTime() - now.getTime()
        : 0;
      const delaySeconds = Math.max(0, Math.floor(delayMs / 1000));
      wheel.insert(item, delaySeconds);
    }
    const wheelInsertEnd = performance.now();
    const wheelMemAfter = process.memoryUsage().heapUsed;

    const wheelExtractStart = performance.now();
    for (let i = 0; i < 3600; i++) {
      wheel.tick();
    }
    const wheelExtractEnd = performance.now();

    this.latestResult = {
      heap_insert_ms: Math.round(heapInsertEnd - heapInsertStart),
      heap_extract_ms: Math.round(heapExtractEnd - heapExtractStart),
      timing_wheel_insert_ms: Math.round(wheelInsertEnd - wheelInsertStart),
      timing_wheel_extract_ms: Math.round(wheelExtractEnd - wheelExtractStart),
      heap_memory_mb: Number(
        Math.max(0, (heapMemAfter - heapMemBefore) / 1024 / 1024).toFixed(2),
      ),
      timing_wheel_memory_mb: Number(
        Math.max(0, (wheelMemAfter - wheelMemBefore) / 1024 / 1024).toFixed(2),
      ),
      total_jobs: count,
      timestamp: new Date().toISOString(),
    };

    return this.latestResult;
  }

  async getLatestResults(): Promise<BenchmarkResult> {
    if (!this.latestResult) {
      throw new NotFoundException('No benchmark results found');
    }
    return this.latestResult;
  }
}
