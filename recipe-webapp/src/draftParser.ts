// The recipe-import-agent has only the platform's fixed chat shape — no
// structured output contract (agent.afm.md, react-webapp) — so its answer is
// prose the agent was instructed to present as "a clearly labeled
// title/category/tags/ingredients/steps block". This reads that block back
// into the draft fields ReviewImportedRecipe shows.
//
// A refusal (unreachable URL, no recognizable recipe) carries none of those
// sections — the agent was told never to invent one to fill the gap — so no
// ingredients/steps is read as "no draft", never as an empty recipe.

export interface ParsedDraft {
  title: string;
  category: string;
  tags: string[];
  ingredients: string[];
  steps: string[];
}

export interface ParseResult {
  draft: ParsedDraft | null;
  /** The agent's own words — shown verbatim when there is no draft to review. */
  message: string;
}

const SECTION_HEADS = ["title", "category", "tags", "ingredients", "steps"] as const;
type Section = (typeof SECTION_HEADS)[number];

function headOf(line: string): Section | null {
  const match = /^\s*#{0,3}\s*\**\s*(title|category|tags|ingredients|steps)\s*\**\s*:?\s*(.*)$/i.exec(
    line,
  );
  if (!match) return null;
  return match[1].toLowerCase() as Section;
}

function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
}

export function parseAgentDraft(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  let title = "";
  let category = "";
  let tags: string[] = [];
  const ingredients: string[] = [];
  const steps: string[] = [];

  let current: Section | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const head = headOf(line);
    if (head) {
      current = head;
      const match = /^\s*#{0,3}\s*\**\s*\w+\s*\**\s*:?\s*(.*)$/i.exec(line);
      const rest = match?.[1]?.trim() ?? "";
      if (rest) {
        if (head === "title") title = rest;
        else if (head === "category") category = rest;
        else if (head === "tags") tags = rest.split(",").map((t) => t.trim()).filter(Boolean);
      }
      continue;
    }
    if (current === "ingredients") ingredients.push(stripBullet(line));
    else if (current === "steps") steps.push(stripBullet(line));
    else if (current === "tags" && tags.length === 0) {
      tags = line.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (current === "title" && !title) {
      title = line;
    } else if (current === "category" && !category) {
      category = line;
    }
  }

  if (!title && !ingredients.length && !steps.length) {
    // Nothing the format produces — the whole reply is the agent's refusal or
    // commentary. Surface it rather than guessing a title from it.
    return { draft: null, message: text.trim() };
  }
  if (!ingredients.length && !steps.length) {
    // A title with no ingredients/steps is still not a usable draft.
    return { draft: null, message: text.trim() };
  }

  return { draft: { title, category, tags, ingredients, steps }, message: text.trim() };
}
