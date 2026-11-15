import { useEffect, useState } from "react";
import { describeError } from "./api";
import { fetchTagRegistry, type RegistryTag } from "./registry";

type RegistryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tags: RegistryTag[] };

/**
 * Loads the tag registry once, when the app starts. Unlike the questions,
 * nothing has to be clicked first, so this is an effect. In development
 * StrictMode runs it twice, and `ignore` drops the first response.
 */
export const useTagRegistry = () => {
  const [registry, setRegistry] = useState<RegistryState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetchTagRegistry().then(
      (tags) => !ignore && setRegistry({ status: "ready", tags }),
      (error) => !ignore && setRegistry({ status: "error", message: describeError(error, "tags") })
    );
    return () => {
      ignore = true;
    };
  }, [attempt]);

  const retry = () => {
    setRegistry({ status: "loading" });
    setAttempt((attempt) => attempt + 1);
  };

  return { registry, retry };
};
