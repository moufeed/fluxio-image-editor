# Performance baseline

Generated: 2026-08-01T20:19:20.603Z

**Scope:** Core microbenches in Vitest/jsdom (`FakeRendererAdapter`). These measure annotation/history/preview-sizing cost — **not** full Fabric `composeDocumentCanvas` / GPU paint.

| | |
| --- | --- |
| Platform | win32 |
| Node | v24.15.0 |
| Runner | vitest+jsdom (FakeRenderer; not Fabric compose) |

## Results

| ID | Scenario | Median | Iterations | Meta |
| --- | --- | ---: | ---: | --- |
| `preview_sizing_8k` | resolvePreviewOutputSize + computePreviewMaxLongEdge (8K) | 0.70 ms | 2000 | previewW=2048, previewH=1366, scale=0.2575, edgeFit=1000, edgeZoomed=2048, maxLongEdge=2048 |
| `normalize_500` | normalizeAnnotations (500 mixed) | 14.92 ms | 20 | — |
| `annotations_equal_500` | annotationsEqual (500 mixed, identical) | 20.38 ms | 10 | — |
| `hit_test_500` | hitTestInteractiveAnnotations (500) | 0.06 ms | 50 | — |
| `group_drag_50` | applyGroupTransformableDrag (50 selection) | 5.46 ms | 30 | — |
| `annotations_set_200` | EditorSession.execute(ANNOTATIONS_SET) × 200 shapes | 2.69 ms | 1 | runs=5, renderCalls=2 |

## Already-in-place mitigations

| Mitigation | Location |
| --- | --- |
| Preview long-edge cap (2048) | `renderer-fabric/src/preview-compose.ts` (`MAX_PREVIEW_LONG_EDGE`) |
| Zoom/DPR-aware preview budget | `computePreviewMaxLongEdge` |
| Layer cache on preview compose | Fabric adapter `composeDocumentCanvas` (`useCache`) |
| rAF coalesce | `scheduleRefresh` |
| History coalesce for sliders | `BoundedHistory` + `coalesceKey` |

## Interpretation / next optimization targets

1. **`annotationsEqual`** — still double-normalizes and `JSON.stringify`s; watch if dense markup commit cost grows.
2. **Fabric compose / export** — not measured here; if hosts report lag on 4K/8K + 200+ annotations, add a Playwright mark around `handle.export` / first paint and compare to this baseline.
3. Soft Vitest ceilings in `pv45-core.bench.spec.ts` catch pathological regressions only.

## Method

1. `npm run perf:pv45` → runs `pv45-core.bench.spec.ts` (writes `docs/perf-pv45-core.json`).
2. This script regenerates `docs/perf-pv45.md`.
3. Re-run on the same machine before/after perf changes.

> Preview long edge capped at MAX_PREVIEW_LONG_EDGE (2048) for interactive compose.
> Fabric full-compose / export timing is out of scope for this core microbench — re-run with Playwright when optimizing.
> ms values are median wall time for the listed iterations (except annotations_set which is median of single executes).
