import { ApiError } from "@trivia-api/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTagRegistry, groupOf, tagDescription, tagLabel } from "./registry";

const respondWith = (body: unknown, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchTagRegistry", () => {
  it("fetches the registry and sorts it by count, most questions first", async () => {
    const fetchMock = respondWith([
      { slug: "animal:axolotls", label: { en: "Axolotls" }, count: 3 },
      { slug: "place:france", label: { en: "France" }, count: 94 },
      { slug: "music:rock", label: { en: "Rock music" }, count: 40 },
    ]);

    const tags = await fetchTagRegistry();

    expect(fetchMock).toHaveBeenCalledWith("https://the-trivia-api.com/v2/tag-registry");
    expect(tags.map((tag) => tag.slug)).toEqual(["place:france", "music:rock", "animal:axolotls"]);
  });

  it("throws an ApiError with the status when the request fails", async () => {
    respondWith({ error: "Too Many Requests" }, 429);

    const error = await fetchTagRegistry().catch((error: unknown) => error);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429 });
  });
});

describe("tagLabel and tagDescription", () => {
  it("read the English text", () => {
    const tag = {
      slug: "place:france",
      label: { en: "France", fr: "La France" },
      description: { en: "Questions about France." },
      count: 94,
    };

    expect(tagLabel(tag)).toBe("France");
    expect(tagDescription(tag)).toBe("Questions about France.");
  });

  it("fall back when there's no English text", () => {
    const tag = { slug: "place:france", label: { fr: "La France" }, count: 94 };

    expect(tagLabel(tag)).toBe("place:france");
    expect(tagDescription(tag)).toBe("");
  });
});

describe("groupOf", () => {
  it.each([
    ["category:geography", "Categories"],
    ["topic:space", "Topics"],
    ["music:rock", "Music"],
    ["place:france", "Places"],
    ["person:albert-einstein", "People"],
    ["work:star-wars", "Films, TV, books and games"],
    ["event:world-war-ii", "Events"],
    ["sport:football", "Sport"],
    ["science:chemistry", "Science"],
    ["food:cheese", "Food and drink"],
    ["era:1960s", "Eras"],
    ["org:nasa", "Organisations"],
    ["animal:axolotls", "Animals"],
  ])("puts %s in %s", (slug, group) => {
    expect(groupOf(slug)).toBe(group);
  });

  it("puts unknown prefixes in Other", () => {
    expect(groupOf("colour:red")).toBe("Other");
    expect(groupOf("no-prefix")).toBe("Other");
  });
});
