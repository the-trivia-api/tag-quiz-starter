import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, getRandomQuestions, type TextChoiceQuestion } from "@trivia-api/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { RegistryTag } from "./registry";

// Replace the network call, but keep the real ApiError class
vi.mock("@trivia-api/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@trivia-api/sdk")>()),
  getRandomQuestions: vi.fn(),
}));

const mockGetRandomQuestions = vi.mocked(getRandomQuestions);

// The tag registry is loaded with plain fetch, so that's mocked too
const mockFetch = vi.fn<typeof fetch>();

const REGISTRY: RegistryTag[] = [
  {
    slug: "place:france",
    label: { en: "France" },
    description: { en: "Questions about France." },
    count: 94,
  },
  {
    slug: "person:albert-einstein",
    label: { en: "Albert Einstein" },
    description: { en: "The physicist behind relativity." },
    count: 12,
  },
];

const registryResponse = () => new Response(JSON.stringify(REGISTRY));

const makeQuestion = (id: string, text: string, correctAnswer: string): TextChoiceQuestion => ({
  id,
  type: "text_choice",
  category: "science",
  difficulty: "easy",
  question: { text },
  correctAnswer,
  incorrectAnswers: ["Wrong 1", "Wrong 2", "Wrong 3"],
  tags: ["place:france"],
  regions: [],
  isNiche: false,
});

/** Waits for the tags to load, then picks one */
const pickTag = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(await screen.findByRole("button", { name: new RegExp(name) }));

beforeEach(() => {
  mockGetRandomQuestions.mockReset();
  mockFetch.mockReset();
  mockFetch.mockImplementation(async () => registryResponse());
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("plays a quiz for the chosen tag and shows the score", async () => {
    const user = userEvent.setup();
    // Asked for 10, but only 2 came back: play with those
    mockGetRandomQuestions.mockResolvedValue([
      makeQuestion("1", "What is the capital of France?", "Paris"),
      makeQuestion("2", "What is brie?", "Cheese"),
    ]);
    render(<App />);

    await pickTag(user, "France");
    expect(screen.getByRole("heading", { name: "France" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(mockGetRandomQuestions).toHaveBeenCalledWith({
      tags: "place:france",
      limit: 10,
      difficulties: undefined,
    });

    expect(
      await screen.findByRole("heading", { name: "What is the capital of France?" })
    ).toHaveFocus();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Paris" }));
    expect(screen.getByRole("status")).toHaveTextContent("Correct!");
    expect(screen.getByRole("button", { name: "Next question" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Wrong 1" }));
    expect(screen.getByRole("status")).toHaveTextContent("Not quite. The answer was Cheese.");

    await user.click(screen.getByRole("button", { name: "See results" }));
    expect(screen.getByRole("heading", { name: "You scored 1 out of 2" })).toHaveFocus();
    expect(screen.getByText("France quiz")).toBeInTheDocument();
  });

  it("only offers as many questions as the tag has", async () => {
    const user = userEvent.setup();
    mockGetRandomQuestions.mockResolvedValue([makeQuestion("1", "Who was Einstein?", "A physicist")]);
    render(<App />);

    await pickTag(user, "Albert Einstein");
    const amounts = screen.getAllByRole("option", { name: /^\d+$/ }).map((option) => option.textContent);
    expect(amounts).toEqual(["5", "10", "12"]);

    await user.selectOptions(screen.getByLabelText("Questions"), "12");
    await user.selectOptions(screen.getByLabelText("Difficulty"), "hard");
    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(mockGetRandomQuestions).toHaveBeenCalledWith({
      tags: "person:albert-einstein",
      limit: 12,
      difficulties: "hard",
    });
  });

  it("goes back to the tags, or plays the same tag again, from the results", async () => {
    const user = userEvent.setup();
    mockGetRandomQuestions.mockResolvedValue([makeQuestion("1", "What is brie?", "Cheese")]);
    render(<App />);

    await pickTag(user, "France");
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await user.click(await screen.findByRole("button", { name: "Cheese" }));
    await user.click(screen.getByRole("button", { name: "See results" }));

    await user.click(screen.getByRole("button", { name: "Play again" }));
    expect(mockGetRandomQuestions).toHaveBeenCalledTimes(2);
    expect(mockGetRandomQuestions).toHaveBeenLastCalledWith({
      tags: "place:france",
      limit: 10,
      difficulties: undefined,
    });

    await user.click(await screen.findByRole("button", { name: "Cheese" }));
    await user.click(screen.getByRole("button", { name: "See results" }));
    await user.click(screen.getByRole("button", { name: "Pick another tag" }));
    expect(screen.getByLabelText("Search tags")).toBeInTheDocument();
    // The registry is kept, so going back doesn't download it again
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks on other answers once one is chosen", async () => {
    const user = userEvent.setup();
    mockGetRandomQuestions.mockResolvedValue([makeQuestion("1", "What is brie?", "Cheese")]);
    render(<App />);

    await pickTag(user, "France");
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await user.click(await screen.findByRole("button", { name: "Wrong 2" }));
    await user.click(screen.getByRole("button", { name: /Cheese/ }));

    expect(screen.getByRole("status")).toHaveTextContent("Not quite.");
    expect(screen.getByRole("button", { name: /Wrong 2/ })).toHaveTextContent("Your answer");
  });

  it("explains a rate limit and lets the player try again", async () => {
    const user = userEvent.setup();
    mockGetRandomQuestions
      .mockRejectedValueOnce(new ApiError(429, "", "Too Many Requests"))
      .mockResolvedValueOnce([makeQuestion("1", "What is brie?", "Cheese")]);
    render(<App />);

    await pickTag(user, "France");
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "What is brie?" })).toBeInTheDocument();
  });

  it("says so when no questions come back", async () => {
    const user = userEvent.setup();
    mockGetRandomQuestions.mockResolvedValue([]);
    render(<App />);

    await pickTag(user, "France");
    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No questions came back");
  });

  it("shows an error if the tags don't load, and lets the player retry", async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load tags");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: /France/ })).toBeInTheDocument();
  });

  it("explains a rate limit when loading the tags", async () => {
    mockFetch.mockResolvedValueOnce(new Response("", { status: 429 }));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
  });
});
