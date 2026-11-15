import {
  ApiError,
  getRandomQuestions,
  type TextChoiceQuestion,
  type V2Question,
} from "@trivia-api/sdk";
import type { RegistryTag } from "./registry";

export type Difficulty = "easy" | "medium" | "hard";

export type QuizSettings = {
  tag: RegistryTag;
  difficulty: Difficulty | "any";
  amount: number;
};

/**
 * The API can also return text input and image questions, but only when you
 * ask for them. This quiz only shows multiple choice (text_choice) questions,
 * so this narrows the type for TypeScript.
 */
const isMultipleChoice = (question: V2Question): question is TextChoiceQuestion =>
  question.type === "text_choice";

/**
 * Gets a set of random questions with the chosen tag. Leaving a filter out
 * means "any", so "any" is turned into undefined rather than sent to the API.
 */
export const fetchQuestions = async (settings: QuizSettings) => {
  const questions = await getRandomQuestions({
    // One tag only: with several, the API returns questions with any of them
    tags: settings.tag.slug,
    limit: settings.amount,
    difficulties: settings.difficulty === "any" ? undefined : settings.difficulty,
  });

  return questions.filter(isMultipleChoice);
};

/** A message for the player, depending on why loading the questions or tags failed */
export const describeError = (error: unknown, loading: "questions" | "tags") => {
  if (error instanceof ApiError && error.status === 429) {
    // Without an API key, requests are rate limited
    return "Too many requests. Wait a few seconds and try again.";
  }
  return `Couldn't load ${loading}. Check your connection and try again.`;
};
