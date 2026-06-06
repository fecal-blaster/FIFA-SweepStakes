import { FootballDataOrgProvider } from "./football-data-org";
import { MockProvider } from "./mock";
import type { FootballProvider } from "./types";

export type { FootballProvider, ProviderMatch, ProviderTeam, ProviderSnapshot } from "./types";

export function getProvider(): FootballProvider {
  const name = process.env.FOOTBALL_PROVIDER ?? "football-data-org";
  if (name === "mock") return new MockProvider();
  if (name === "football-data-org") {
    const key = process.env.FOOTBALL_DATA_API_KEY;
    if (!key) {
      // Fall back to mock if no key — avoids crashing local dev.
      return new MockProvider();
    }
    return new FootballDataOrgProvider(key);
  }
  throw new Error(`Unknown FOOTBALL_PROVIDER: ${name}`);
}
