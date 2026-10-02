import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  FormControlLabel,
  PageContent,
  PageTitle,
  Stack,
} from "@wso2/oxygen-ui";
import { recipeApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/recipe-api";

type ShoppingListItem = components["schemas"]["ShoppingListItem"];

export function ShoppingListPage(): JSX.Element {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    recipeApi
      .GET("/me/shopping-list", { params: { query: { limit: 100 } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError("Could not load your shopping list.");
          return;
        }
        setItems(data?.data ?? []);
      })
      .catch(() => live && setError("Could not load your shopping list."));
    return () => {
      live = false;
    };
  }, []);

  const groups = useMemo(() => {
    const byRecipe = new Map<string, { title: string; items: ShoppingListItem[] }>();
    for (const item of items) {
      const group = byRecipe.get(item.recipeId);
      if (group) group.items.push(item);
      else byRecipe.set(item.recipeId, { title: item.recipeTitle ?? "Recipe", items: [item] });
    }
    return [...byRecipe.values()];
  }, [items]);

  async function toggle(item: ShoppingListItem, isChecked: boolean): Promise<void> {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isChecked } : i)));
    const { error: apiError } = await recipeApi.PATCH("/me/shopping-list/{itemId}", {
      params: { path: { itemId: item.id } },
      body: { isChecked },
    });
    if (apiError) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isChecked: !isChecked } : i)));
      setError("That item could not be updated.");
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Shopping List</PageTitle.Header>
      </PageTitle>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {groups.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your shopping list is empty. Generate one from your meal plan.
        </Alert>
      ) : (
        <Stack spacing={2} sx={{ mb: 3 }}>
          {groups.map((group) => (
            <Card key={group.title}>
              <CardHeader title={group.title} />
              <CardContent>
                <Stack>
                  {group.items.map((item) => (
                    <FormControlLabel
                      key={item.id}
                      control={
                        <Checkbox
                          checked={item.isChecked}
                          onChange={(e) => void toggle(item, e.target.checked)}
                        />
                      }
                      label={item.ingredientText}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Stack direction="row" justifyContent="flex-end">
        <Can op="GET /me/meal-plan">
          <Button variant="outlined" onClick={() => navigate("/meal-plan")}>
            Regenerate from Meal Plan
          </Button>
        </Can>
      </Stack>
    </PageContent>
  );
}
