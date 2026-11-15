import { useState } from "react";
import { describeError, fetchQuestions, type QuizSettings } from "./api";
import { tagLabel, type RegistryTag } from "./registry";
import { shuffle } from "./shuffle";
import { isCorrect, type Round } from "./types";
import { useTagRegistry } from "./useTagRegistry";
import { TagPicker } from "./components/TagPicker";
import { QuizOptions } from "./components/QuizOptions";
import { QuestionCard } from "./components/QuestionCard";
import { Results } from "./components/Results";
import { StatusCard } from "./components/StatusCard";

/**
 * Everything the quiz can be doing. Each status only has the data it needs,
 * so e.g. there's no way to be "playing" without any questions.
 */
type GameState =
  | { status: "picking" }
  | { status: "options"; tag: RegistryTag }
  | { status: "loading" }
  | { status: "error"; settings: QuizSettings; message: string }
  | { status: "playing"; settings: QuizSettings; rounds: Round[]; current: number }
  | { status: "finished"; settings: QuizSettings; rounds: Round[] };

export const App = () => {
  const { registry, retry: retryRegistry } = useTagRegistry();
  const [game, setGame] = useState<GameState>({ status: "picking" });

  // Fetching from the event handler, rather than an effect, means one click is
  // always one request (effects run twice in development with StrictMode)
  const startQuiz = async (settings: QuizSettings) => {
    setGame({ status: "loading" });

    try {
      const questions = await fetchQuestions(settings);
      if (questions.length === 0) {
        setGame({
          status: "error",
          settings,
          message: "No questions came back for that tag. Try a different difficulty.",
        });
        return;
      }

      // If fewer questions came back than were asked for, play with those
      setGame({
        status: "playing",
        settings,
        current: 0,
        rounds: questions.map((question) => ({
          question,
          answers: shuffle([question.correctAnswer, ...question.incorrectAnswers]),
          chosen: null,
        })),
      });
    } catch (error) {
      setGame({ status: "error", settings, message: describeError(error, "questions") });
    }
  };

  const answer = (choice: string) =>
    setGame((game) =>
      game.status === "playing"
        ? {
            ...game,
            rounds: game.rounds.map((round, index) =>
              index === game.current ? { ...round, chosen: choice } : round
            ),
          }
        : game
    );

  const goToNextQuestion = () =>
    setGame((game) => {
      if (game.status !== "playing") return game;
      return game.current + 1 < game.rounds.length
        ? { ...game, current: game.current + 1 }
        : { status: "finished", settings: game.settings, rounds: game.rounds };
    });

  const pickTag = (tag: RegistryTag) => setGame({ status: "options", tag });
  const pickAnotherTag = () => setGame({ status: "picking" });

  return (
    <div className="page">
      <header className="header">
        <h1 className="header__title">Tag Quiz</h1>
        <p className="header__subtitle">
          Pick any tag and answer questions about it. Built with React and{" "}
          <a href="https://the-trivia-api.com" className="link">
            The Trivia API
          </a>
        </p>
      </header>

      <main>
        {game.status === "picking" && (
          <>
            {registry.status === "loading" && <StatusCard title="Loading tags…" isLoading />}
            {registry.status === "error" && (
              <StatusCard
                title="Something went wrong"
                message={registry.message}
                onRetry={retryRegistry}
              />
            )}
            {registry.status === "ready" && <TagPicker tags={registry.tags} onPick={pickTag} />}
          </>
        )}

        {game.status === "options" && (
          <QuizOptions tag={game.tag} onStart={startQuiz} onBack={pickAnotherTag} />
        )}

        {game.status === "loading" && <StatusCard title="Loading questions…" isLoading />}

        {game.status === "error" && (
          <StatusCard
            title="Something went wrong"
            message={game.message}
            onRetry={() => startQuiz(game.settings)}
            onChangeSettings={() => pickTag(game.settings.tag)}
          />
        )}

        {game.status === "playing" && (
          <QuestionCard
            // A new key per question resets the card's focus handling
            key={game.rounds[game.current].question.id}
            round={game.rounds[game.current]}
            number={game.current + 1}
            total={game.rounds.length}
            score={game.rounds.filter(isCorrect).length}
            onAnswer={answer}
            onNext={goToNextQuestion}
          />
        )}

        {game.status === "finished" && (
          <Results
            rounds={game.rounds}
            tagLabel={tagLabel(game.settings.tag)}
            onPlayAgain={() => startQuiz(game.settings)}
            onPickAnotherTag={pickAnotherTag}
          />
        )}
      </main>

      <footer className="footer">
        <a href="https://github.com/the-trivia-api/tag-quiz-starter" className="link">
          View the code on GitHub
        </a>
        <span aria-hidden>·</span>
        <a href="https://the-trivia-api.com/docs/tutorials/quiz-by-tag" className="link">
          Tutorial
        </a>
        <span aria-hidden>·</span>
        <a href="https://the-trivia-api.com/docs/" className="link">
          API docs
        </a>
      </footer>
    </div>
  );
};
