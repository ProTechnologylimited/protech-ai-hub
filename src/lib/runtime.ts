import { createProvider } from "./ai";
import { quickAuthVerifier } from "./auth";
import { getConfig } from "./config";
import { createHandlers } from "./handlers";
import { repo } from "./repo";
import { createThrottle } from "./throttle";

const globalForHandlers = globalThis as unknown as { __protechHandlers?: ReturnType<typeof createHandlers> };

/** Production wiring of the API handlers (real DB, real Quick Auth, real AI provider). */
export const handlers =
  globalForHandlers.__protechHandlers ??
  (globalForHandlers.__protechHandlers = createHandlers({
    getConfig: () => getConfig(),
    verifier: quickAuthVerifier,
    store: repo,
    getProvider: createProvider,
    throttle: createThrottle(),
    now: () => new Date(),
  }));
