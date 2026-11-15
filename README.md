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

The app loads the tag registry once when it starts (`GET /v2/tag-registry`). Each tag has a slug like `place:france`, an English label and description, and a count of the multiple choice questions it has. The start of the slug says what kind of tag it is, which the picker uses to group them.

When the player picks a tag, the questions come from The Trivia API through [`@trivia-api/sdk`](https://www.npmjs.com/package/@trivia-api/sdk), with `getRandomQuestions({ tags: "place:france", limit: 10 })`.

- [`src/registry.ts`](src/registry.ts) fetches the tag registry with plain `fetch`, and has the types and helpers for reading it
- [`src/useTagRegistry.ts`](src/useTagRegistry.ts) loads the registry when the app starts, with loading and error states
- [`src/api.ts`](src/api.ts) fetches the questions for a tag, and turns errors into something a player can read (e.g. when you hit the rate limit)
- [`src/App.tsx`](src/App.tsx) holds the state of the game: picking a tag, choosing options, loading, playing, finished or errored
- [`src/shuffle.ts`](src/shuffle.ts) mixes the correct answer in with the incorrect ones, without bias
- [`src/components/`](src/components) has one component per screen: [`TagPicker`](src/components/TagPicker.tsx), [`QuizOptions`](src/components/QuizOptions.tsx), [`QuestionCard`](src/components/QuestionCard.tsx), [`Results`](src/components/Results.tsx) and [`StatusCard`](src/components/StatusCard.tsx) for loading and errors

Styling is plain CSS in [`src/index.css`](src/index.css). The colours are custom properties at the top, so changing those restyles the whole app.

The tests mock `fetch` and the SDK, so they never call the real API. That's probably the pattern to copy if you add your own.

### One tag at a time

If you pass several tags in one request (`tags: "place:france,music:rock"`), the API returns questions with any of them, so tags are combined with OR, not AND. This example always sends exactly one tag.

### No API key needed

Everything here works without a key. Without one, each IP address can make 20 requests every 5 seconds and get up to 50 questions per request. If the player goes over the rate limit, the app asks them to wait a few seconds and try again.

## Going further

Some ideas if you want to build on it:

- Remembering the search and group when the player goes back to the tags
- A link to each tag's quiz, so players can share it
- Text input and image questions: pass `types` to `getRandomQuestions`, and the same `types` to the registry (`/v2/tag-registry?types=text_choice,text_input`) so the counts match

The last one needs an [API key](https://the-trivia-api.com/pricing/). The [API docs](https://the-trivia-api.com/docs/) cover everything else.

## Using it commercially

The Trivia API is free for non-commercial projects. For anything commercial you'll need a [subscription](https://the-trivia-api.com/pricing/).
