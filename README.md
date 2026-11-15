# Tag Quiz

A tag quiz built with React and [The Trivia API](https://the-trivia-api.com). Browse the tags in the API's tag registry, pick one (e.g. France, rock music or the 1960s), then answer questions with that tag.

**[Try the live demo](https://tag-quiz-starter.vercel.app)**

The [quiz by tag tutorial](https://the-trivia-api.com/docs/tutorials/quiz-by-tag) walks through this code step by step.

Do whatever you like with it: fork it, copy bits out of it, or use it as the starting point for your own quiz. It's [MIT licensed](LICENSE).

## Running it

You'll need Node 20.19 or later.

```sh
npm install
npm run dev
```

Then open http://localhost:5173. No API key needed.

Other scripts:

- `npm test` runs the tests
- `npm run build` builds the app into `dist/`
- `npm run lint` lints with oxlint

## How it works

The app loads the tag registry when it starts (`GET /v2/tag-registry?language=en`). Each tag has a slug like `place:france`, a label and description, and a count of the multiple choice questions it has. The labels and descriptions come in the language you ask for (`{ "label": { "fr": "France" } }` for `language=fr`), and `tagLabel` and `tagDescription` fall back to English, then the slug, if one is missing. The start of the slug says what kind of tag it is, which the picker uses to group them.

The "Tag language" menu in the header loads the registry again in another language. The search and group are kept, and the search looks at the text being shown.

When the player picks a tag, the questions come from The Trivia API through [`@trivia-api/sdk`](https://www.npmjs.com/package/@trivia-api/sdk), with `getRandomQuestions({ tags: "place:france", limit: 10 })`.

- [`src/registry.ts`](src/registry.ts) fetches the tag registry with plain `fetch`, and has the types and helpers for reading it
- [`src/languages.ts`](src/languages.ts) lists the languages the registry has labels in
- [`src/useTagRegistry.ts`](src/useTagRegistry.ts) loads the registry when the app starts and when the language changes, with loading and error states
- [`src/api.ts`](src/api.ts) fetches the questions for a tag, and turns errors into something a player can read (e.g. when you hit the rate limit)
- [`src/App.tsx`](src/App.tsx) holds the state of the game: picking a tag, choosing options, loading, playing, finished or errored
- [`src/shuffle.ts`](src/shuffle.ts) mixes the correct answer in with the incorrect ones, without bias
- [`src/components/`](src/components) has one component per screen: [`TagPicker`](src/components/TagPicker.tsx), [`QuizOptions`](src/components/QuizOptions.tsx), [`QuestionCard`](src/components/QuestionCard.tsx), [`Results`](src/components/Results.tsx) and [`StatusCard`](src/components/StatusCard.tsx) for loading and errors

Styling is plain CSS in [`src/index.css`](src/index.css). The colours are custom properties at the top, so changing those restyles the whole app.

The tests mock `fetch` and the SDK, so they never call the real API. That's probably the pattern to copy if you add your own.

### One tag at a time

If you pass several tags in one request (`tags: "place:france,music:rock"`), the API returns questions with any of them, so tags are combined with OR, not AND. This example always sends exactly one tag.

### Tag language

Tag names are translated, but the questions are in English: translated questions need an API key with a Complete subscription, so this example doesn't pass `language` to `getRandomQuestions`.

### No API key needed

Everything here works without a key.

## Going further

Some ideas if you want to build on it:

- Remembering the search and group when the player goes back to the tags
- A link to each tag's quiz, so players can share it
- Text input and image questions: pass `types` to `getRandomQuestions`, and the same `types` to the registry (`/v2/tag-registry?types=text_choice,text_input`) so the counts match

The last one needs an [API key](https://the-trivia-api.com/pricing/). The [API docs](https://the-trivia-api.com/docs/) cover everything else.

## Using it commercially

The Trivia API is free for non-commercial projects. For anything commercial you'll need a [subscription](https://the-trivia-api.com/pricing/).
