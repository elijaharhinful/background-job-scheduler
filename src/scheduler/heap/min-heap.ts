import { JobHeapItem } from '../../common/interfaces/job-heap-item.interface';

export class MinHeap {
  private heap: JobHeapItem[] = [];
  private idMap: Map<string, number> = new Map();

  get size(): number {
    return this.heap.length;
  }

  get items(): JobHeapItem[] {
    return [...this.heap];
  }

  insert(item: JobHeapItem): void {
    if (this.idMap.has(item.id)) {
      this.update(item.id, item);
      return;
    }
    this.heap.push(item);
    const index = this.heap.length - 1;
    this.idMap.set(item.id, index);
    this.bubbleUp(index);
  }

  extractMin(): JobHeapItem | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) {
      const item = this.heap.pop()!;
      this.idMap.delete(item.id);
      return item;
    }

    const min = this.heap[0];
    this.idMap.delete(min.id);
    this.heap[0] = this.heap.pop()!;
    this.idMap.set(this.heap[0].id, 0);
    this.sinkDown(0);
    return min;
  }

  peek(): JobHeapItem | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  remove(id: string): void {
    const index = this.idMap.get(id);
    if (index === undefined) return;

    if (index === this.heap.length - 1) {
      this.heap.pop();
      this.idMap.delete(id);
      return;
    }

    this.heap[index] = this.heap.pop()!;
    this.idMap.set(this.heap[index].id, index);
    this.idMap.delete(id);

    this.bubbleUp(index);
    this.sinkDown(index);
  }

  update(id: string, updates: Partial<JobHeapItem>): void {
    const index = this.idMap.get(id);
    if (index === undefined) return;

    const item = this.heap[index];
    Object.assign(item, updates);

    this.bubbleUp(index);
    this.sinkDown(index);
  }

  has(id: string): boolean {
    return this.idMap.has(id);
  }

  clear(): void {
    this.heap = [];
    this.idMap.clear();
  }

  private bubbleUp(index: number): void {
    const item = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];

      if (this.compare(item, parent) >= 0) break;

      this.heap[index] = parent;
      this.idMap.set(parent.id, index);
      index = parentIndex;
    }
    this.heap[index] = item;
    this.idMap.set(item.id, index);
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const item = this.heap[index];

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let leftChild: JobHeapItem | undefined;
      let rightChild: JobHeapItem | undefined;
      let swapIndex: number | null = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (this.compare(leftChild, item) < 0) {
          swapIndex = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (
          (swapIndex === null && this.compare(rightChild, item) < 0) ||
          (swapIndex !== null &&
            leftChild &&
            this.compare(rightChild, leftChild) < 0)
        ) {
          swapIndex = rightChildIndex;
        }
      }

      if (swapIndex === null) break;

      this.heap[index] = this.heap[swapIndex];
      this.idMap.set(this.heap[index].id, index);
      index = swapIndex;
    }

    this.heap[index] = item;
    this.idMap.set(item.id, index);
  }

  private compare(a: JobHeapItem, b: JobHeapItem): number {
    // Both are scheduled jobs
    if (a.scheduledAt && b.scheduledAt) {
      if (a.scheduledAt.getTime() !== b.scheduledAt.getTime()) {
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      }
    } else if (a.scheduledAt && !b.scheduledAt) {
      return 1; // Scheduled jobs go after immediate jobs
    } else if (!a.scheduledAt && b.scheduledAt) {
      return -1; // Immediate jobs go before scheduled jobs
    }

    // Compare effective priority (lower number = higher priority)
    if (a.effectivePriority !== b.effectivePriority) {
      return a.effectivePriority - b.effectivePriority;
    }

    // Tie-breaker: creation time (FIFO)
    return a.createdAt.getTime() - b.createdAt.getTime();
  }
}
