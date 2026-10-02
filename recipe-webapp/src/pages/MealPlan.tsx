import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { recipeApi } from "../api";
import { Can } from "../authz/gates";
import { currentWeek } from "../mealPlanWeek";
import type { components } from "../generated/recipe-api";

type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type Recipe = components["schemas"]["Recipe"];

const NONE = "__none__";

export function MealPlanPage(): JSX.Element {
  const navigate = useNavigate();
  const week = useMemo(() => currentWeek(), []);
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(week[0].date);
  const [selectedRecipe, setSelectedRecipe] = useState(NONE);
  const [saving, setSaving] = useState(false);

  async function loadEntries(): Promise<void> {
    const { data, error: apiError } = await recipeApi.GET("/me/meal-plan", {
      params: { query: { from: week[0].date, to: week[6].date, limit: 100 } },
    });
    if (apiError) {
      setError("Could not load your meal plan.");
      return;
    }
    setEntries(data?.data ?? []);
  }

  useEffect(() => {
    let live = true;
    void (async () => {
      const [, recipesResult] = await Promise.all([
        loadEntries(),
        recipeApi.GET("/me/recipes", { params: { query: { limit: 100 } } }),
      ]);
      if (!live) return;
      setRecipes(recipesResult.data?.data ?? []);
    })();
    return () => {
      live = false;
    };
    // Intentionally run once, against the fixed current-week range.
  }, [week]);

  const entryByDate = useMemo(() => {
    const map = new Map<string, MealPlanEntry>();
    for (const entry of entries) map.set(entry.plannedDate, entry);
    return map;
  }, [entries]);

  function openAssignDialog(): void {
    setSelectedDay(week[0].date);
    setSelectedRecipe(entryByDate.get(week[0].date)?.recipeId ?? NONE);
    setDialogOpen(true);
  }

  function onDayChange(date: string): void {
    setSelectedDay(date);
    setSelectedRecipe(entryByDate.get(date)?.recipeId ?? NONE);
  }

  async function handleAssign(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const existing = entryByDate.get(selectedDay);
      if (existing) {
        await recipeApi.DELETE("/me/meal-plan/{entryId}", {
          params: { path: { entryId: existing.id } },
        });
      }
      if (selectedRecipe !== NONE) {
        const { error: apiError } = await recipeApi.POST("/me/meal-plan", {
          body: { recipeId: selectedRecipe, plannedDate: selectedDay },
        });
        if (apiError) {
          setError("That recipe could not be assigned to that day.");
          return;
        }
      }
      await loadEntries();
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate(): Promise<void> {
    const { error: apiError } = await recipeApi.POST("/me/shopping-list/generate");
    if (apiError) {
      setError("The shopping list could not be generated.");
      return;
    }
    navigate("/shopping-list");
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Weekly Meal Plan</PageTitle.Header>
      </PageTitle>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <ListingTable.Container sx={{ width: "100%", mb: 3 }} disablePaper>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Day</ListingTable.Cell>
              <ListingTable.Cell>Recipe</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {week.map((day) => (
              <ListingTable.Row
                key={day.date}
                hover
                clickable
                onClick={() => navigate("/recipes")}
              >
                <ListingTable.Cell>{day.name}</ListingTable.Cell>
                <ListingTable.Cell>{entryByDate.get(day.date)?.recipeTitle ?? "-"}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>

      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Can op="POST /me/meal-plan">
          <Button variant="outlined" onClick={openAssignDialog}>
            Assign Recipe to Day
          </Button>
        </Can>
        <Can op="POST /me/shopping-list/generate">
          <Button variant="contained" onClick={() => void handleGenerate()}>
            Generate Shopping List
          </Button>
        </Can>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Day"
              value={selectedDay}
              onChange={(e) => onDayChange(e.target.value)}
              fullWidth
            >
              {week.map((day) => (
                <MenuItem key={day.date} value={day.date}>
                  {day.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Recipe"
              value={selectedRecipe}
              onChange={(e) => setSelectedRecipe(e.target.value)}
              fullWidth
            >
              <MenuItem value={NONE}>— None (remove) —</MenuItem>
              {recipes.map((recipe) => (
                <MenuItem key={recipe.id} value={recipe.id}>
                  {recipe.title}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={() => void handleAssign()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}
