import { useState } from "react";
import { GROUP_NAMES, groupOf, tagDescription, tagLabel, type RegistryTag } from "../registry";

type TagPickerProps = {
  /** Every tag in the registry, most questions first */
  tags: RegistryTag[];
  onPick: (tag: RegistryTag) => void;
};

/** A quiz is 10 questions by default, so smaller tags are hidden unless asked for */
const MIN_QUESTIONS = 10;

/**
 * There are about 1,000 tags. Filtering them all on every keystroke is cheap,
 * but rendering them all is slow on low-end phones, so only the first 50
 * matches are shown until the player asks for more.
 */
const PAGE_SIZE = 50;

const pluralise = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const TagPicker = ({ tags, onPick }: TagPickerProps) => {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("All");
  const [showSmallTags, setShowSmallTags] = useState(false);
  const [shownCount, setShownCount] = useState(PAGE_SIZE);

  const query = search.trim().toLowerCase();
  const matches = tags.filter(
    (tag) =>
      (showSmallTags || tag.count >= MIN_QUESTIONS) &&
      (group === "All" || groupOf(tag.slug) === group) &&
      (tagLabel(tag).toLowerCase().includes(query) ||
        tagDescription(tag).toLowerCase().includes(query))
  );
  const shownTags = matches.slice(0, shownCount);

  // Changing a filter starts the list from the top again
  const resetShownCount = () => setShownCount(PAGE_SIZE);

  return (
    <section className="card" aria-labelledby="picker-title">
      <h2 id="picker-title" className="card__title">
        Pick a tag
      </h2>

      <div className="fields">
        <label className="field">
          <span className="field__label">Search tags</span>
          <input
            type="search"
            className="input"
            placeholder="e.g. France, rock, 1960s"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetShownCount();
            }}
          />
        </label>

        <label className="field">
          <span className="field__label">Group</span>
          <select
            className="select"
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              resetShownCount();
            }}
          >
            <option value="All">All</option>
            {GROUP_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={showSmallTags}
          onChange={(event) => {
            setShowSmallTags(event.target.checked);
            resetShownCount();
          }}
        />
        Show tags with fewer than {MIN_QUESTIONS} questions
      </label>

      {/* A live region, so screen reader users hear how many tags match as they type */}
      <p className="card__text" role="status">
        {matches.length === 0
          ? "No tags match your search."
          : matches.length > shownTags.length
            ? `Showing ${shownTags.length} of ${pluralise(matches.length, "tag")}`
            : pluralise(matches.length, "tag")}
      </p>

      {shownTags.length > 0 && (
        <ul className="tags" aria-label="Tags">
          {shownTags.map((tag) => {
            const isEmpty = tag.count === 0;
            return (
              <li key={tag.slug}>
                {/* aria-disabled rather than disabled, so the tag can still be focused and read */}
                <button
                  type="button"
                  className="tag"
                  aria-disabled={isEmpty}
                  onClick={() => !isEmpty && onPick(tag)}
                >
                  <span className="tag__label">{tagLabel(tag)}</span>
                  {tagDescription(tag) && (
                    <span className="tag__description">{tagDescription(tag)}</span>
                  )}
                  <span className="tag__meta">
                    {groupOf(tag.slug)} · {pluralise(tag.count, "question")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {matches.length > shownTags.length && (
        <button
          type="button"
          className="button"
          onClick={() => setShownCount((count) => count + PAGE_SIZE)}
        >
          Show more
        </button>
      )}
    </section>
  );
};
