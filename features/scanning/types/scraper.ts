export interface StructureConfig {

  name: string;

  productSelector: string;

  titleSelector: string;

  descriptionSelector: string;

  urlSelector: string;

  urlType: "href" | "onclick";

  removeChildren?: boolean;

  ignoreSelectors?: string[];

  children?: StructureConfig;
  childrenSearchEnabled: boolean;
}

export interface ScraperConfig {
  structures: StructureConfig[];
}


export interface ParsedProduct {
  name: string;
  description: string;
  productUrl: string;
  semiSupplier?: string;
}