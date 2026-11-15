import { ApiError } from "@trivia-api/sdk";

/** Text in several languages, keyed by language code, e.g. `{ en: "France" }` */
type LocalisedText = Partial<Record<string, string>>;

/** One tag from the tag registry */
export type RegistryTag = {
  /** What you pass to the API, e.g. "place:france" */
  slug: string;
  label?: LocalisedText;
  description?: LocalisedText;
  /** How many multiple choice questions have this tag */
  count: number;
};

const REGISTRY_URL = "https://the-trivia-api.com/v2/tag-registry";

/**
 * Gets every tag in the registry, with the most questions first. This uses
 * plain fetch, but throws the same ApiError as the SDK when the request
 * fails, so errors from both can be handled in one place.
 */
export const fetchTagRegistry = async (): Promise<RegistryTag[]> => {
  const response = await fetch(REGISTRY_URL);
  if (!response.ok) {
    throw new ApiError(response.status, await response.text(), response.statusText);
  }

  const tags: RegistryTag[] = await response.json();
  return tags.sort((a, b) => b.count - a.count);
};

/** The tag's English name, or its slug if it doesn't have one */
export const tagLabel = (tag: RegistryTag) => tag.label?.en ?? tag.slug;

/** The tag's English description, or nothing if it doesn't have one */
export const tagDescription = (tag: RegistryTag) => tag.description?.en ?? "";

/** The start of a slug ("place" in "place:france") says what kind of tag it is */
const GROUPS: Record<string, string> = {
  category: "Categories",
  topic: "Topics",
  music: "Music",
  place: "Places",
  person: "People",
  work: "Films, TV, books and games",
  event: "Events",
  sport: "Sport",
  science: "Science",
  food: "Food and drink",
  era: "Eras",
  org: "Organisations",
  animal: "Animals",
};

export const GROUP_NAMES = Object.values(GROUPS);

/** A friendly name for the kind of tag, e.g. "Places" for "place:france" */
export const groupOf = (slug: string) => {
  const prefix = slug.split(":")[0];
  // Object.hasOwn, so a slug like "constructor:x" doesn't match a built-in
  return Object.hasOwn(GROUPS, prefix) ? GROUPS[prefix] : "Other";
};
