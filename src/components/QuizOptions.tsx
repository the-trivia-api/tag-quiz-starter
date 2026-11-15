import { useEffect, useRef } from "react";
import type { Difficulty, QuizSettings } from "../api";
import { tagDescription, tagLabel, type RegistryTag } from "../registry";

type QuizOptionsProps = {
  tag: RegistryTag;
  /** The language the tag's label and description are shown in */
  language: string;
  onStart: (settings: QuizSettings) => void;
  onBack: () => void;
};

const AMOUNTS = [5, 10, 15];

export const QuizOptions = ({ tag, language, onStart, onBack }: QuizOptionsProps) => {
  // Never offer more questions than the tag has, e.g. 5, 10 and 12 for a tag with 12
  const amounts = [...new Set(AMOUNTS.map((amount) => Math.min(amount, tag.count)))];
  const defaultAmount = amounts.filter((amount) => amount <= 10).at(-1) ?? amounts[0];

  const headingRef = useRef<HTMLHeadingElement>(null);

  // The tag button that was clicked has gone, so move focus here
  useEffect(() => headingRef.current?.focus(), []);

  // A form action gets the submitted values as FormData, so the selects don't
  // need their own state
  const start = (formData: FormData) =>
    onStart({
      tag,
      difficulty: formData.get("difficulty") as Difficulty | "any",
      amount: Number(formData.get("amount")),
    });

  return (
    <form action={start} className="card">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="card__title">
          {tagLabel(tag, language)}
        </h2>
        {tagDescription(tag, language) && (
          <p className="card__text">{tagDescription(tag, language)}</p>
        )}
      </div>

      <div className="fields">
        <label className="field">
          <span className="field__label">Questions</span>
          <select name="amount" defaultValue={defaultAmount} className="select">
            {amounts.map((amount) => (
              <option key={amount} value={amount}>
                {amount}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Difficulty</span>
          <select name="difficulty" defaultValue="any" className="select">
            <option value="any">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <div className="actions">
        <button type="submit" className="button button--primary">
          Start quiz
        </button>
        <button type="button" className="button" onClick={onBack}>
          Pick another tag
        </button>
      </div>
    </form>
  );
};
