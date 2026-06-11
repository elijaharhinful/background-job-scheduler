import { JobHeapItem } from '../../common/interfaces/job-heap-item.interface';

interface WheelSlot {
  items: Map<string, JobHeapItem>;
}

export class TimingWheel {
  private readonly slots: WheelSlot[];
  private readonly size: number;
  private currentIndex: number = 0;

  constructor(size: number = 60) {
    this.size = size;
    this.slots = Array.from({ length: size }, () => ({
      items: new Map(),
    }));
  }

  insert(item: JobHeapItem, delaySeconds: number): void {
    if (delaySeconds < 0) return;

    // Calculate slots to move forward
    const slotsToAdvance = Math.floor(delaySeconds);
    const targetIndex = (this.currentIndex + slotsToAdvance) % this.size;

    this.slots[targetIndex].items.set(item.id, item);
  }

  remove(id: string): void {
    for (const slot of this.slots) {
      if (slot.items.has(id)) {
        slot.items.delete(id);
        return;
      }
    }
  }

  tick(): JobHeapItem[] {
    const currentSlot = this.slots[this.currentIndex];
    const matureItems = Array.from(currentSlot.items.values());
    currentSlot.items.clear();

    this.currentIndex = (this.currentIndex + 1) % this.size;

    return matureItems;
  }
}
