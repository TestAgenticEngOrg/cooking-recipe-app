// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. Each screen names the one
// API operation it LOADS, and the gate follows from that (thunder-authentication).
//
// Order is the rail's order (navbar order in wireframes.dsl), and the first
// reachable row is the landing screen: Recipes, RecipeDetail, NewRecipe,
// EditRecipe, ImportRecipe, ReviewImportedRecipe, MealPlan, ShoppingList.

import { canCall } from "./core";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  readonly public?: boolean;
}

export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "recipes", label: "Recipes", path: "/recipes", loads: "GET /me/recipes" },
  {
    key: "recipe-detail",
    label: "Recipe Detail",
    path: "/recipes/:recipeId",
    loads: "GET /me/recipes/{recipeId}",
  },
  { key: "new-recipe", label: "New Recipe", path: "/recipes/new", loads: "POST /me/recipes" },
  {
    key: "edit-recipe",
    label: "Edit Recipe",
    path: "/recipes/:recipeId/edit",
    // Needs the existing recipe to prefill the form, so it gates on the read —
    // the Cook role holds both recipes:read and recipes:update together.
    loads: "GET /me/recipes/{recipeId}",
  },
  {
    key: "import-recipe",
    label: "Import Recipe",
    path: "/import",
    // The extract action calls the recipe-import-agent's fixed /chat shape,
    // which carries no OpenAPI contract and so contributes no OperationKey
    // (thunder-authentication's generator only projects openapi.yaml
    // contracts). Any signed-in Cook may open this screen.
    loads: null,
  },
  {
    key: "review-imported-recipe",
    label: "Review Imported Recipe",
    path: "/import/review",
    loads: "POST /me/recipes",
  },
  { key: "meal-plan", label: "Meal Plan", path: "/meal-plan", loads: "GET /me/meal-plan" },
  {
    key: "shopping-list",
    label: "Shopping List",
    path: "/shopping-list",
    loads: "GET /me/shopping-list",
  },
];

// FAIL LOUDLY at module load — a committed table that outlived its contract
// must not silently gate on nothing.
for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some(
    (screen) => !screen.public && screen.loads !== null,
  );
}
