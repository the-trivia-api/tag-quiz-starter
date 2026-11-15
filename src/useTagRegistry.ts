import { useEffect, useState } from "react";
import { describeError } from "./api";
import { fetchTagRegistry, type RegistryTag } from "./registry";

type RegistryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tags: RegistryTag[] };

/**
 * Loads the tag registry when the app starts, and again whenever the language
 * changes. Unlike the questions, nothing has to be clicked first, so this is
 * an effect. In development StrictMode runs it twice, and `ignore` drops the
 * first response (and the response for a language that's no longer wanted).
 */
export const useTagRegistry = (language = "en") => {
  const [attempt, setAttempt] = useState(0);
  // The last response, with the request it answered
  const [loaded, setLoaded] = useState<{ key: string; state: RegistryState } | null>(null);
  // The last tags that loaded, kept while another language loads
  const [lastTags, setLastTags] = useState<{ language: string; tags: RegistryTag[] } | null>(
    null
  );
  const key = `${language} ${attempt}`;

  useEffect(() => {
    let ignore = false;
    const settle = (state: RegistryState) => !ignore && setLoaded({ key, state });
    fetchTagRegistry(language).then(
      (tags) => {
        if (!ignore) setLastTags({ language, tags });
        settle({ status: "ready", tags });
      },
      (error) => settle({ status: "error", message: describeError(error, "tags") })
    );
    return () => {
      ignore = true;
    };
  }, [key, language]);

  // Until the response for this language (and attempt) comes back, it's loading
  const registry: RegistryState = loaded?.key === key ? loaded.state : { status: "loading" };
  const retry = () => setAttempt((attempt) => attempt + 1);

  return { registry, lastTags, retry };
};
