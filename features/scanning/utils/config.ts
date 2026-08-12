import { ScraperConfig } from "../types/scraper";

export function getScraperConfig(config: unknown): ScraperConfig {
  return (config as ScraperConfig) ?? {
    keywords: [],
    structures: [],
  };
}