import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  ListingTable,
  PageContent,
  PageTitle,
  SearchBar,
  Stack,
  TextField,
  MenuItem,
  Typography,
} from "@wso2/oxygen-ui";
import { Plus, Upload } from "@wso2/oxygen-ui-icons-react";
import { recipeApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/recipe-api";

type Recipe = components["schemas"]["Recipe"];

export function RecipesPage(): JSX.Element {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    let live = true;
    recipeApi
      .GET("/me/recipes", { params: { query: { limit: 100 } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError) {
          setError("Could not load your recipes.");
          return;
        }
        setRecipes(data?.data ?? []);
      })
      .catch(() => live && setError("Could not load your recipes."));
    return () => {
      live = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set((recipes ?? []).map((r) => r.category).filter(Boolean))].sort(),
    [recipes],
  );
  const tags = useMemo(
    () => [...new Set((recipes ?? []).flatMap((r) => r.tags ?? []))].sort(),
    [recipes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (recipes ?? []).filter((r) => {
      if (q && !r.title.toLowerCase().includes(q)) return false;
      if (category && r.category !== category) return false;
      if (tag && !(r.tags ?? []).includes(tag)) return false;
      return true;
    });
  }, [recipes, query, category, tag]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Recipes</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="outlined" startIcon={<Upload size={18} />} onClick={() => navigate("/import")}>
            Import from text or URL
          </Button>
          <Can op="POST /me/recipes">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/recipes/new")}
            >
              New Recipe
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <SearchBar
          placeholder="Search by title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All tags</MenuItem>
          {tags.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error ? <Typography color="error">{error}</Typography> : null}

      {recipes !== null && filtered.length === 0 ? (
        <ListingTable.EmptyState
          title="No recipes found"
          description={
            recipes.length === 0
              ? "Create your first recipe, or import one from text or a URL."
              : "Try adjusting your search or filters."
          }
        />
      ) : (
        <ListingTable.Container sx={{ width: "100%" }} disablePaper>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Title</ListingTable.Cell>
                <ListingTable.Cell>Category</ListingTable.Cell>
                <ListingTable.Cell>Tags</ListingTable.Cell>
                <ListingTable.Cell>Favorite</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {filtered.map((recipe) => (
                <ListingTable.Row
                  key={recipe.id}
                  hover
                  clickable
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                >
                  <ListingTable.Cell>{recipe.title}</ListingTable.Cell>
                  <ListingTable.Cell>{recipe.category}</ListingTable.Cell>
                  <ListingTable.Cell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {(recipe.tags ?? []).map((t) => (
                        <Chip key={t} label={t} size="small" />
                      ))}
                    </Box>
                  </ListingTable.Cell>
                  <ListingTable.Cell>{recipe.isFavorite ? "★" : ""}</ListingTable.Cell>
                </ListingTable.Row>
              ))}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      )}
    </PageContent>
  );
}
