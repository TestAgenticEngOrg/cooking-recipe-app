// ROUTING STRUCTURE is prescribed by thunder-authentication (App.example.tsx):
// NoAccess sits ABOVE the shell and REPLACES it; Forbidden sits INSIDE the
// shell; /forbidden is wired once from the router root; every gated route is
// wrapped in <RequireOperation>, taken from SCREEN_ROUTES; /callback is routed
// outside the provider.
import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppShell } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { Box, Typography } from "@wso2/oxygen-ui";
import { CallbackPage } from "./pages/Callback";
import { RecipesPage } from "./pages/Recipes";
import { RecipeDetailPage } from "./pages/RecipeDetail";
import { NewRecipePage } from "./pages/NewRecipe";
import { EditRecipePage } from "./pages/EditRecipe";
import { ImportRecipePage } from "./pages/ImportRecipe";
import { ReviewImportedRecipePage } from "./pages/ReviewImportedRecipe";
import { MealPlanPage } from "./pages/MealPlan";
import { ShoppingListPage } from "./pages/ShoppingList";

/** YOUR pages, keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  recipes: <RecipesPage />,
  "recipe-detail": <RecipeDetailPage />,
  "new-recipe": <NewRecipePage />,
  "edit-recipe": <EditRecipePage />,
  "import-recipe": <ImportRecipePage />,
  "review-imported-recipe": <ReviewImportedRecipePage />,
  "meal-plan": <MealPlanPage />,
  "shopping-list": <ShoppingListPage />,
};

/** The screens reachable before sign-in — none here: every flow in this app's
 * wireframes carries `role "Cook"`, so nothing is routed above the guard. */
const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={
              <AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>
            }
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Typography variant="body1" color="text.secondary">
        Checking your session…
      </Typography>
    </Box>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard. Only a MISSING session starts a sign-in: currentUser()
  // already tried a silent renew, and signing in on a merely expired token
  // re-logs the user in on every visit.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
