/**
 * lib/work_stealer.js — Work-stealing scheduler for load balancing
 * Distributes tasks across workers using deque-based work stealing.
 * @module lib/work_stealer
 */

export class Deque {
  constructor() { this.items = []; this.head = 0; }
  push(item) { this.items.push(item); }
  pop() { return this.items.length > 0 ? this.items.pop() : null; }
  steal() { return this.head < this.items.length ? this.items[this.head++] : null; }
  get size() { return this.items.length - this.head; }
  get empty() { return this.size <= 0; }
}

export class WorkStealingScheduler {
  constructor(numWorkers = 4) {
    this.workers = Array.from({ length: numWorkers }, () => new Deque());
    this.running = false;
  }

  submit(task, workerId = null) {
    if (workerId !== null && workerId >= 0 && workerId < this.workers.length) {
      this.workers[workerId].push(task);
    } else {
      // Round-robin
      const idx = Math.floor(Math.random() * this.workers.length);
      this.workers[idx].push(task);
    }
  }

  async run(processor) {
    this.running = true;
    const promises = this.workers.map(async (deque, id) => {
      while (this.running && !deque.empty) {
        const task = deque.pop();
        if (task) await processor(task, id);
      }
    });
    await Promise.all(promises);
    this.running = false;
  }

  stop() { this.running = false; }
}

export default { Deque, WorkStealingScheduler };
