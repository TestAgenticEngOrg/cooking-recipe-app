// The SERVICE half of mock mode — recipe-api's own data, ownership and 404s —
// plus a hand-written stand-in for the recipe-import-agent's one fixed /chat
// shape, which carries no OpenAPI contract to read a gateway table from
// (react-webapp, thunder-authentication). mock/authz/gateway.ts is the GATEWAY
// half; no scope check belongs here (mock-mode.md).
//
// State lives in this module, not a server: a full page load re-runs it and
// puts the seed data back. Only in-app navigation carries a change forward.

import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/recipe-api";
import { currentWeek } from "../src/mealPlanWeek";

type Recipe = components["schemas"]["Recipe"];
type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type ShoppingListItem = components["schemas"]["ShoppingListItem"];

// The caller every /me/… row below is seeded against — shaped like the gateway
// assertion a real request carries, so /me/ and every-row reach can never look
// identical by accident.
export const mockCaller = { userId: "mock-cook-1", username: "mock-cook" };

const week = currentWeek();

let recipes: Recipe[] = [
  {
    id: "r1",
    title: "Grandma's Chili",
    category: "Dinner",
    tags: ["spicy", "beef"],
    ingredients: [
      "2 lb ground beef",
      "1 can kidney beans",
      "2 cups diced tomatoes",
      "1 onion, chopped",
    ],
    steps: [
      "Brown the beef",
      "Add onions and cook until soft",
      "Stir in beans and tomatoes",
      "Simmer 30 minutes",
    ],
    photoUrl: null,
    isFavorite: true,
    sourceUrl: null,
    createdAt: new Date("2026-01-05T10:00:00Z").toISOString(),
  },
  {
    id: "r2",
    title: "Pancakes",
    category: "Breakfast",
    tags: ["sweet"],
    ingredients: ["2 cups flour", "1 cup milk"],
    steps: ["Mix the batter until just combined", "Cook on a hot griddle until golden on both sides"],
    photoUrl: null,
    isFavorite: false,
    sourceUrl: null,
    createdAt: new Date("2026-01-06T10:00:00Z").toISOString(),
  },
  {
    id: "r3",
    title: "Garden Salad",
    category: "Lunch",
    tags: ["vegan", "quick"],
    ingredients: ["Mixed greens", "Cherry tomatoes", "Cucumber", "Olive oil"],
    steps: ["Chop the vegetables", "Toss with olive oil"],
    photoUrl: null,
    isFavorite: true,
    sourceUrl: null,
    createdAt: new Date("2026-01-07T10:00:00Z").toISOString(),
  },
];

let mealPlan: MealPlanEntry[] = [
  { id: "mp1", recipeId: "r1", recipeTitle: "Grandma's Chili", plannedDate: week[0].date },
  { id: "mp2", recipeId: "r2", recipeTitle: "Pancakes", plannedDate: week[1].date },
];

let shoppingList: ShoppingListItem[] = [
  { id: "sl1", recipeId: "r1", recipeTitle: "Grandma's Chili", ingredientText: "2 lb ground beef", isChecked: false },
  { id: "sl2", recipeId: "r1", recipeTitle: "Grandma's Chili", ingredientText: "1 can kidney beans", isChecked: true },
  { id: "sl3", recipeId: "r1", recipeTitle: "Grandma's Chili", ingredientText: "2 cups diced tomatoes", isChecked: false },
  { id: "sl4", recipeId: "r2", recipeTitle: "Pancakes", ingredientText: "2 cups flour", isChecked: false },
  { id: "sl5", recipeId: "r2", recipeTitle: "Pancakes", ingredientText: "1 cup milk", isChecked: false },
];

let nextId = 100;
const freshId = (prefix: string) => `${prefix}${nextId++}`;

function notFound(message: string) {
  return HttpResponse.json({ code: 404, message }, { status: 404 });
}

export const handlers = [
  // --- recipes ---------------------------------------------------------

  http.get("/api/me/recipes", ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const category = url.searchParams.get("category") ?? "";
    const tag = url.searchParams.get("tag") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    let data = recipes;
    if (q) data = data.filter((r) => r.title.toLowerCase().includes(q));
    if (category) data = data.filter((r) => r.category === category);
    if (tag) data = data.filter((r) => (r.tags ?? []).includes(tag));

    const page = data.slice(offset, offset + limit);
    return HttpResponse.json({ count: data.length, next: null, previous: null, data: page });
  }),

  http.post("/api/me/recipes", async ({ request }) => {
    const input = (await request.json()) as Partial<Recipe> & { title?: string };
    if (!input?.title || !input.title.trim()) {
      return HttpResponse.json({ code: 400, message: "title is required" }, { status: 400 });
    }
    const created: Recipe = {
      id: freshId("r"),
      title: input.title,
      category: input.category ?? "",
      tags: input.tags ?? [],
      ingredients: input.ingredients ?? [],
      steps: input.steps ?? [],
      photoUrl: null,
      isFavorite: input.isFavorite ?? false,
      sourceUrl: null,
      createdAt: new Date().toISOString(),
    };
    recipes = [...recipes, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/me/recipes/:recipeId", ({ params }) => {
    // Every seeded recipe belongs to mockCaller — there is no "someone else's"
    // row to filter out here, unlike the owner-widening fixture in mock-mode.md.
    const recipe = recipes.find((r) => r.id === params.recipeId);
    if (!recipe) return notFound("no such recipe for the caller");
    return HttpResponse.json(recipe);
  }),

  http.put("/api/me/recipes/:recipeId", async ({ params, request }) => {
    const existing = recipes.find((r) => r.id === params.recipeId);
    if (!existing) return notFound("no such recipe for the caller");
    const input = (await request.json()) as Partial<Recipe> & { title?: string };
    if (!input?.title || !input.title.trim()) {
      return HttpResponse.json({ code: 400, message: "title is required" }, { status: 400 });
    }
    const updated: Recipe = {
      ...existing,
      title: input.title,
      category: input.category ?? existing.category,
      tags: input.tags ?? existing.tags,
      ingredients: input.ingredients ?? existing.ingredients,
      steps: input.steps ?? existing.steps,
      isFavorite: input.isFavorite ?? existing.isFavorite,
    };
    recipes = recipes.map((r) => (r.id === updated.id ? updated : r));
    return HttpResponse.json(updated);
  }),

  http.delete("/api/me/recipes/:recipeId", ({ params }) => {
    const before = recipes.length;
    recipes = recipes.filter((r) => r.id !== params.recipeId);
    if (recipes.length === before) return notFound("no such recipe for the caller");
    return new HttpResponse(null, { status: 204 });
  }),

  http.put("/api/me/recipes/:recipeId/photo", async ({ params, request }) => {
    const existing = recipes.find((r) => r.id === params.recipeId);
    if (!existing) return notFound("no such recipe for the caller");
    const input = (await request.json()) as { photo?: string };
    if (!input?.photo) {
      return HttpResponse.json({ code: 400, message: "photo is required" }, { status: 400 });
    }
    const updated: Recipe = { ...existing, photoUrl: `data:image/png;base64,${input.photo}` };
    recipes = recipes.map((r) => (r.id === updated.id ? updated : r));
    return HttpResponse.json(updated);
  }),

  // --- meal plan ---------------------------------------------------------

  http.get("/api/me/meal-plan", ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let data = mealPlan;
    if (from) data = data.filter((e) => e.plannedDate >= from);
    if (to) data = data.filter((e) => e.plannedDate <= to);
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.post("/api/me/meal-plan", async ({ request }) => {
    const input = (await request.json()) as { recipeId?: string; plannedDate?: string };
    const recipe = recipes.find((r) => r.id === input?.recipeId);
    if (!recipe) return notFound("no such recipe for the caller");
    if (!input?.plannedDate) {
      return HttpResponse.json({ code: 400, message: "plannedDate is required" }, { status: 400 });
    }
    const created: MealPlanEntry = {
      id: freshId("mp"),
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      plannedDate: input.plannedDate,
    };
    mealPlan = [...mealPlan.filter((e) => e.plannedDate !== input.plannedDate), created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete("/api/me/meal-plan/:entryId", ({ params }) => {
    const before = mealPlan.length;
    mealPlan = mealPlan.filter((e) => e.id !== params.entryId);
    if (mealPlan.length === before) return notFound("no such entry for the caller");
    return new HttpResponse(null, { status: 204 });
  }),

  // --- shopping list -------------------------------------------------------

  http.post("/api/me/shopping-list/generate", () => {
    shoppingList = mealPlan.flatMap((entry) => {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) return [];
      return recipe.ingredients.map((ingredientText) => ({
        id: freshId("sl"),
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        ingredientText,
        isChecked: false,
      }));
    });
    return HttpResponse.json({ count: shoppingList.length, data: shoppingList });
  }),

  http.get("/api/me/shopping-list", ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const page = shoppingList.slice(offset, offset + limit);
    return HttpResponse.json({ count: shoppingList.length, next: null, previous: null, data: page });
  }),

  http.patch("/api/me/shopping-list/:itemId", async ({ params, request }) => {
    const existing = shoppingList.find((i) => i.id === params.itemId);
    if (!existing) return notFound("no such item for the caller");
    const input = (await request.json()) as { isChecked?: boolean };
    const updated = { ...existing, isChecked: Boolean(input?.isChecked) };
    shoppingList = shoppingList.map((i) => (i.id === updated.id ? updated : i));
    return HttpResponse.json(updated);
  }),

  // --- recipe-import-agent (extra sibling, fixed /chat shape) -------------
  //
  // No OpenAPI contract exists for an ai-agent (react-webapp), so
  // mock/authz/gateway.ts's table has no row for this path — it is never the
  // gateway's to refuse. Its design declares exposesAPI.auth like any other
  // sibling, so the one thing this stands in for is "signed in at all".
  http.post("/api/recipe-import-agent/chat", async ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth) return new HttpResponse(null, { status: 401 });

    const body = (await request.json()) as { conversationId?: string; message?: string };
    const message = (body?.message ?? "").trim();
    const text = extractDraftText(message);
    return HttpResponse.json({
      conversationId: body?.conversationId ?? freshId("conv"),
      text,
      toolCalls: [],
    });
  }),
];

// --- the agent's mock extraction -------------------------------------------
//
// The agent speaks only prose (agent.afm.md), so this produces the same
// "clearly labeled title/category/tags/ingredients/steps block" the real
// agent is instructed to answer with, and src/draftParser.ts reads it back —
// exercising the real parsing code during the walk, not a shortcut around it.

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/\b(bar|cake|cookie|pie|dessert|lemon)\b/i, "Dessert"],
  [/\b(chili|dinner|casserole|roast)\b/i, "Dinner"],
  [/\b(pancake|egg|breakfast|waffle)\b/i, "Breakfast"],
  [/\b(salad|sandwich|lunch|soup)\b/i, "Lunch"],
];
const TAG_KEYWORDS = ["vegan", "quick", "spicy", "sweet", "beef"];
const INGREDIENT_HINT = /\b(cup|cups|tbsp|tsp|oz|lb|clove|can|egg|flour|sugar|butter|salt|pepper|g|ml)\b/i;

function extractDraftText(message: string): string {
  if (!message) {
    return "I didn't receive any text or a URL to work from — paste the recipe text, or send a link.";
  }

  const looksLikeUrl = /^https?:\/\//i.test(message);
  if (looksLikeUrl && /invalid|example\.invalid|does-not-exist/i.test(message)) {
    return (
      `I couldn't reach ${message} — the link doesn't resolve to a page I can read. ` +
      "Please check the URL, or paste the recipe text instead."
    );
  }

  const lines = message
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return "That didn't contain anything I could recognize as a recipe. Please paste the recipe text instead.";
  }

  // Already-labeled sections (a Cook who pastes a well-formatted recipe) win
  // over the heuristic split below.
  const headed = splitByHeaders(lines);
  const title = headed.title || lines[0].replace(/^(recipe:?|title:?)\s*/i, "").slice(0, 80);
  let ingredients = headed.ingredients;
  let steps = headed.steps;

  if (ingredients.length === 0 && steps.length === 0) {
    const rest = lines.slice(1);
    ingredients = rest.filter((l) => INGREDIENT_HINT.test(l) || /^\d/.test(l));
    steps = rest.filter((l) => !ingredients.includes(l));
  }

  if (ingredients.length === 0 && steps.length === 0) {
    return (
      "I couldn't find a recognizable recipe in that — no ingredients or steps I could make out. " +
      "Please paste the recipe text, including its ingredients and steps."
    );
  }

  const category = CATEGORY_KEYWORDS.find(([re]) => re.test(message))?.[1] ?? "";
  const tags = TAG_KEYWORDS.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(message));

  return [
    `Title: ${title}`,
    `Category: ${category}`,
    `Tags: ${tags.join(", ")}`,
    "Ingredients:",
    ...ingredients.map((i) => `- ${i}`),
    "Steps:",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Please review the draft above and correct anything before saving.",
  ].join("\n");
}

function splitByHeaders(lines: string[]): { title: string; ingredients: string[]; steps: string[] } {
  let section: "none" | "ingredients" | "steps" = "none";
  let title = "";
  const ingredients: string[] = [];
  const steps: string[] = [];
  for (const line of lines) {
    if (/^ingredients:?$/i.test(line)) {
      section = "ingredients";
      continue;
    }
    if (/^steps:?$/i.test(line)) {
      section = "steps";
      continue;
    }
    if (section === "ingredients") ingredients.push(line.replace(/^[-*•]\s*/, ""));
    else if (section === "steps") steps.push(line.replace(/^\d+[.)]\s*/, ""));
    else if (!title) title = line;
  }
  return { title, ingredients, steps };
}
