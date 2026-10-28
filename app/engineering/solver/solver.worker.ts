import highsLoader from 'highs'

self.onmessage = async (event: MessageEvent<{ model: string; wasmUrl: string }>) => {
  try {
    const highs = await highsLoader({ locateFile: () => event.data.wasmUrl })
    const solution = highs.solve(event.data.model, { output_flag: false, presolve: 'on', time_limit: 20 })
    self.postMessage({ ok: true, solution })
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Solver gagal memproses model.' })
  }
}

