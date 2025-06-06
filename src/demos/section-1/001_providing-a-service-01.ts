import { Context, Data, Effect } from "effect"
import * as fs from "node:fs/promises"

class CacheMissError extends Data.TaggedError("CacheMissError")<{
  readonly message: string
}> {}

class Cache extends Context.Tag("app/Cache")<Cache, {
  readonly lookup: (key: string) => Effect.Effect<string, CacheMissError>
}>() {}

const store: Map<string, string> = new Map([
  ["key1", "in-memory-value1"],
  ["key2", "in-memory-value2"],
  ["key3", "in-memory-value3"]
])

const InMemoryCache = Cache.of({
  lookup: (key) =>
    Effect.fromNullable(store.get(key)).pipe(
      Effect.catchTag("NoSuchElementException", () => {
        return new CacheMissError({ message: `Cache key "${key}" not found` })
      })
    )
})

const FileSystemCache = Cache.of({
  lookup: (key) =>
    Effect.tryPromise({
      try: () => fs.readFile(`src/demos/section-1/cache/${key}`, "utf-8"),
      catch: () => new CacheMissError({ message: `Failed to read file for cache key: "${key}"` })
    })
})

const subProgramOne = Effect.gen(function*() {
  const cache = yield* Cache
  const value = yield* cache.lookup("key1")
  console.log(value)
})

const subProgramTwo = Effect.gen(function*() {
  const cache = yield* Cache
  const value = yield* cache.lookup("key2")
  console.log(value)
})

const program = Effect.gen(function*() {
  // Execute the first sub-program with the in-memory cache
  yield* subProgramOne.pipe(
    Effect.provideService(Cache, InMemoryCache)
  )
  // Execute the second sub-program with the file system cache
  yield* subProgramTwo.pipe(
    Effect.provideService(Cache, FileSystemCache)
  )
})

Effect.runPromise(program)
/*
Output:
in-memory-value1
file-value2
*/
