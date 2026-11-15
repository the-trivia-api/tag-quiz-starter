import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RegistryTag } from "../registry";
import { TagPicker } from "./TagPicker";

const makeTag = (slug: string, label: string, count: number, description = ""): RegistryTag => ({
  slug,
  label: { en: label },
  description: { en: description },
  count,
});

const TAGS = [
  makeTag("place:france", "France", 94, "Questions about France: its history, places and food."),
  makeTag("music:rock", "Rock music", 40, "Guitars, bands and anthems."),
  makeTag("person:albert-einstein", "Albert Einstein", 12, "The physicist behind relativity."),
  makeTag("era:1960s", "The 1960s", 8, "Moon landings and the space race."),
  makeTag("animal:axolotls", "Axolotls", 0, "Mexico's walking fish."),
];

/** The labels of the tags in the list, in order */
const shownTags = () =>
  within(screen.getByRole("list", { name: "Tags" }))
    .queryAllByRole("button")
    .map((button) => button.querySelector(".tag__label")?.textContent);

describe("TagPicker", () => {
  it("lists tags with their description and count, hiding tags with fewer than 10 questions", () => {
    render(<TagPicker tags={TAGS} onPick={vi.fn()} />);

    expect(shownTags()).toEqual(["France", "Rock music", "Albert Einstein"]);
    const france = screen.getByRole("button", { name: /France/ });
    expect(france).toHaveTextContent("Questions about France: its history, places and food.");
    expect(france).toHaveTextContent("94 questions");
  });

  it("shows smaller tags when asked, but won't start a quiz from one with no questions", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<TagPicker tags={TAGS} onPick={onPick} />);

    await user.click(screen.getByLabelText("Show tags with fewer than 10 questions"));
    expect(shownTags()).toEqual(["France", "Rock music", "Albert Einstein", "The 1960s", "Axolotls"]);

    const axolotls = screen.getByRole("button", { name: /Axolotls/ });
    expect(axolotls).toHaveAttribute("aria-disabled", "true");
    await user.click(axolotls);
    expect(onPick).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /The 1960s/ }));
    expect(onPick).toHaveBeenCalledWith(TAGS[3]);
  });

  it("searches labels and descriptions, ignoring case", async () => {
    const user = userEvent.setup();
    render(<TagPicker tags={TAGS} onPick={vi.fn()} />);

    await user.type(screen.getByLabelText("Search tags"), "FRANCE");
    expect(shownTags()).toEqual(["France"]);

    await user.clear(screen.getByLabelText("Search tags"));
    await user.type(screen.getByLabelText("Search tags"), "guitars");
    expect(shownTags()).toEqual(["Rock music"]);
  });

  it("filters by group", async () => {
    const user = userEvent.setup();
    render(<TagPicker tags={TAGS} onPick={vi.fn()} />);

    expect(screen.getByLabelText("Group")).toHaveValue("All");
    await user.selectOptions(screen.getByLabelText("Group"), "People");
    expect(shownTags()).toEqual(["Albert Einstein"]);
  });

  it("says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<TagPicker tags={TAGS} onPick={vi.fn()} />);

    await user.type(screen.getByLabelText("Search tags"), "dinosaurs");

    expect(screen.queryByRole("list", { name: "Tags" })).not.toBeInTheDocument();
    expect(screen.getByText("No tags match your search.")).toBeInTheDocument();
  });

  it("shows 50 tags at first, and more on request", async () => {
    const user = userEvent.setup();
    const manyTags = Array.from({ length: 60 }, (_, i) => makeTag(`topic:t${i}`, `Tag ${i}`, 100 - i));
    render(<TagPicker tags={manyTags} onPick={vi.fn()} />);

    expect(shownTags()).toHaveLength(50);
    expect(screen.getByText("Showing 50 of 60 tags")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show more" }));
    expect(shownTags()).toHaveLength(60);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("can be used with the keyboard", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<TagPicker tags={TAGS} onPick={onPick} />);

    // Search box, group, checkbox, then the first tag
    await user.tab();
    expect(screen.getByLabelText("Search tags")).toHaveFocus();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: /France/ })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onPick).toHaveBeenCalledWith(TAGS[0]);
  });
});
