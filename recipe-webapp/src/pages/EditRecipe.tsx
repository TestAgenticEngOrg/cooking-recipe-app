import { useEffect, useRef, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Form,
  FormControlLabel,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  Switch,
  TextField,
} from "@wso2/oxygen-ui";
import { recipeApi } from "../api";
import { CATEGORY_OPTIONS } from "../recipeConstants";
import { joinLines, linesOf } from "../textLines";
import type { components } from "../generated/recipe-api";

type Recipe = components["schemas"]["Recipe"];

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      // "data:image/png;base64,AAAA..." — the API wants the base64 body alone.
      resolve(result.split(",").pop() ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

export function EditRecipePage(): JSX.Element {
  const { recipeId = "" } = useParams();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    recipeApi
      .GET("/me/recipes/{recipeId}", { params: { path: { recipeId } } })
      .then(({ data, error: apiError }) => {
        if (!live) return;
        if (apiError || !data) {
          setError("This recipe could not be found.");
          return;
        }
        setRecipe(data);
        setTitle(data.title);
        setCategory(data.category);
        setTags(joinLines(data.tags, ", "));
        setIngredients(joinLines(data.ingredients));
        setSteps(joinLines(data.steps));
        setIsFavorite(data.isFavorite ?? false);
        setPhotoUrl(data.photoUrl ?? null);
      })
      .catch(() => live && setError("This recipe could not be found."));
    return () => {
      live = false;
    };
  }, [recipeId]);

  async function handleSave(): Promise<void> {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = await recipeApi.PUT("/me/recipes/{recipeId}", {
        params: { path: { recipeId } },
        body: {
          title: title.trim(),
          category: category.trim(),
          tags: linesOf(tags, ","),
          ingredients: linesOf(ingredients),
          steps: linesOf(steps),
          isFavorite,
        },
      });
      if (apiError) {
        setError("That recipe could not be saved. Check the required fields.");
        return;
      }
      navigate(`/recipes/${recipeId}`);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChosen(file: File): Promise<void> {
    const photo = await toBase64(file);
    const { data, error: apiError } = await recipeApi.PUT("/me/recipes/{recipeId}/photo", {
      params: { path: { recipeId } },
      body: { photo },
    });
    if (apiError) {
      setError("That photo could not be attached.");
      return;
    }
    setPhotoUrl(data?.photoUrl ?? null);
  }

  if (error && !recipe) {
    return (
      <PageContent>
        <Alert severity="error">{error}</Alert>
      </PageContent>
    );
  }

  if (!recipe) {
    return <PageContent>Loading…</PageContent>;
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Edit Recipe</PageTitle.Header>
      </PageTitle>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Form.Section>
        <Form.Stack>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            <MenuItem value="">Unset</MenuItem>
            {CATEGORY_OPTIONS.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
          />
          <TextField
            label="Ingredients, one per line"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            multiline
            minRows={4}
            fullWidth
          />
          <TextField
            label="Steps, one per line"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            multiline
            minRows={4}
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} />}
            label="Favorite"
          />

          {photoUrl ? (
            <Box
              component="img"
              src={photoUrl}
              alt="Finished meal photo"
              sx={{ width: "100%", maxWidth: 360, borderRadius: 1 }}
            />
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePhotoChosen(file);
              e.target.value = "";
            }}
          />
          <Button variant="outlined" onClick={() => fileInput.current?.click()} sx={{ alignSelf: "flex-start" }}>
            Replace photo
          </Button>
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate(`/recipes/${recipeId}`)}>
          Cancel
        </Button>
        <Button variant="contained" disabled={saving} onClick={() => void handleSave()}>
          Save Changes
        </Button>
      </Stack>
    </PageContent>
  );
}
