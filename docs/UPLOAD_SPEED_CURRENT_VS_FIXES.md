# Upload speed: current vs fixes (best possible, latency as proxy)

| Aspect | Before fixes | After fixes (best possible) |
|--------|----------------|-----------------------------|
| **Speed probe** | Fast < 600 ms, medium < 1500 ms, else slow | **Fast < 1000 ms**, **medium < 2000 ms**, else slow |
| **Fast connection** | 4 MB chunks, 2 parallel | **10 MB chunks**, 2 parallel |
| **Medium connection** | 3 MB chunks, 2 parallel | **10 MB chunks**, 2 parallel |
| **Slow connection** | 2 MB chunks, **1 parallel** | **8 MB chunks**, **2 parallel** |
| **80+ MB large file** | 3 MB, 2 parallel | **10 MB**, 2 parallel |
| **400+ MB very large** | 1 MB, **1 parallel** | **10 MB**, **2 parallel** |
| **Server chunk limit** | 10 MB | 10 MB (unchanged) |

## Summary

- **Before:** "Slow" and "very large" used small chunks and **1 parallel** → many round trips and underused bandwidth in prod.
- **After (best possible):** Latency is the only proxy (no bandwidth measurement). All desktop tiers use **2 parallel**. Fast and medium use **10 MB** (server max); slow uses **8 MB**. Large (80+ MB) and very large (400+ MB) use **10 MB**, 2 parallel. Probe thresholds relaxed so more users get fast/medium (1000 ms / 2000 ms).
