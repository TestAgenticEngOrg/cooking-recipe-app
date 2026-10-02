import { useEffect, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  List,
  ListItem,
  ListItemText,
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { recipeApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/recipe-api";

type Recipe = components["schemas"]["Recipe"];

export function RecipeDetailPage(): JSX.Element {
  const { recipeId = "" } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let live = true;
    recipeApi
      .GET("/me/recipes/{recipeId}", { params: { path: { recipeId } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError("This recipe could not be found.");
          return;
        }
        setRecipe(data ?? null);
      })
      .catch(() => live && setError("This recipe could not be found."));
    return () => {
      live = false;
    };
  }, [recipeId]);

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await recipeApi.DELETE("/me/recipes/{recipeId}", { params: { path: { recipeId } } });
      navigate("/recipes");
    } finally {
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <PageContent>
        <Typography color="error">{error}</Typography>
      </PageContent>
    );
  }

  if (!recipe) {
    return (
      <PageContent>
        <Typography color="text.secondary">Loading…</Typography>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/recipes")} />
        <PageTitle.Header>{recipe.title}</PageTitle.Header>
        <PageTitle.Actions>
          {recipe.isFavorite ? <Chip label="Favorite" color="success" /> : null}
          <Can op="GET /me/recipes/{recipeId}">
            <Button variant="outlined" onClick={() => navigate(`/recipes/${recipeId}/edit`)}>
              Edit
            </Button>
          </Can>
          <Can op="DELETE /me/recipes/{recipeId}">
            <Button variant="outlined" disabled={deleting} onClick={() => void handleDelete()}>
              Delete
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {recipe.photoUrl ? (
        <Box
          component="img"
          src={recipe.photoUrl}
          alt="Finished meal photo"
          sx={{ width: "100%", maxWidth: 480, borderRadius: 1, mb: 2 }}
        />
      ) : null}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Category: {recipe.category} &nbsp;|&nbsp; Tags: {(recipe.tags ?? []).join(", ") || "—"}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Ingredients" />
          <CardContent>
            <List>
              {recipe.ingredients.map((ingredient, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText primary={ingredient} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Steps" />
          <CardContent>
            <List>
              {recipe.steps.map((step, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText primary={`${i + 1}. ${step}`} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Box>

      <Button variant="outlined" onClick={() => navigate("/meal-plan")}>
        Add to meal plan
      </Button>
    </PageContent>
  );
}
