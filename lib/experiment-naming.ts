import type { Experiment } from "@/lib/types";

const GENERATED_TITLE_WORD_LIMIT = 8;
const GENERATED_TITLE_CHAR_LIMIT = 64;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trimToWordLimit(value: string, maxWords: number): string {
  const words = normalizeWhitespace(value).split(" ");

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

function trimToCharLimit(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars - 3).trimEnd()}...`;
}

function getHypothesisSubject(hypothesis: string): string {
  const normalizedHypothesis = normalizeWhitespace(hypothesis);
  const [leadingClause] = normalizedHypothesis.split(/\bwill\b/i);

  return leadingClause || normalizedHypothesis;
}

/**
 * Builds a concise experiment title from a hypothesis.
 *
 * @param hypothesis - Full experiment hypothesis.
 * @returns A short, readable experiment title.
 */
export function createExperimentName(hypothesis: string): string {
  const subject = getHypothesisSubject(hypothesis);
  const wordLimited = trimToWordLimit(subject, GENERATED_TITLE_WORD_LIMIT);

  return trimToCharLimit(wordLimited, GENERATED_TITLE_CHAR_LIMIT) || "Untitled experiment";
}

/**
 * Returns the best display title for an experiment, repairing older duplicated names when needed.
 *
 * @param experiment - Experiment name and hypothesis values.
 * @returns A concise title suitable for dashboard headings and cards.
 */
export function getExperimentDisplayName(
  experiment: Pick<Experiment, "name" | "hypothesis">
): string {
  const normalizedName = normalizeWhitespace(experiment.name);
  const normalizedHypothesis = normalizeWhitespace(experiment.hypothesis);

  if (
    !normalizedName ||
    normalizedName === normalizedHypothesis ||
    normalizedHypothesis.startsWith(normalizedName)
  ) {
    return createExperimentName(normalizedHypothesis);
  }

  return normalizedName;
}
