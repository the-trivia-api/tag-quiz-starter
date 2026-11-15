import { useState } from "react";
import { describeError, fetchQuestions, type QuizSettings } from "./api";
import { LANGUAGES } from "./languages";
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
  const [language, setLanguage] = useState("en");
  const { registry, lastTags, retry: retryRegistry } = useTagRegistry(language);
  const [game, setGame] = useState<GameState>({ status: "picking" });

  // After the language changes, the registry has a new copy of each tag, with
  // the labels in that language. Until it loads, the last tags that loaded
  // (and their language) are used, so the old name stays on screen
  const inLanguage = (tag: RegistryTag) => {
    const loaded = lastTags?.tags.find(({ slug }) => slug === tag.slug);
    return loaded && lastTags ? { tag: loaded, language: lastTags.language } : { tag, language };
  };
  const labelOf = (tag: RegistryTag) => {
    const shown = inLanguage(tag);
    return tagLabel(shown.tag, shown.language);
  };

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
        <label className="field header__language">
          <span className="field__label">Tag language</span>
          <select
            className="select"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-describedby="language-note"
          >
            {LANGUAGES.map(({ code, name }) => (
              <option key={code} value={code} lang={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p id="language-note" className="header__note">
          Tag names are translated. The questions are in English unless you use an API key with a
          Complete subscription.
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
            {registry.status !== "error" && (
              // Hidden rather than removed while another language loads, so
              // the search and group are kept
              <div hidden={registry.status === "loading"}>
                <TagPicker
                  tags={registry.status === "ready" ? registry.tags : []}
                  language={language}
                  onPick={pickTag}
                />
              </div>
            )}
          </>
        )}

        {game.status === "options" && (
          <QuizOptions
            {...inLanguage(game.tag)}
            onStart={startQuiz}
            onBack={pickAnotherTag}
          />
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
            tagLabel={labelOf(game.settings.tag)}
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
