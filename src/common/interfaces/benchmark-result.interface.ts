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
