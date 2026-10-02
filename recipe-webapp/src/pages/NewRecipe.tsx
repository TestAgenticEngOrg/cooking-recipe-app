import { useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Form,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { recipeApi } from "../api";
import { CATEGORY_OPTIONS } from "../recipeConstants";
import { linesOf } from "../textLines";

export function NewRecipePage(): JSX.Element {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = await recipeApi.POST("/me/recipes", {
        body: {
          title: title.trim(),
          category: category.trim(),
          tags: linesOf(tags, ","),
          ingredients: linesOf(ingredients),
          steps: linesOf(steps),
        },
      });
      if (apiError) {
        setError("That recipe could not be saved. Check the required fields.");
        return;
      }
      navigate("/recipes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>New Recipe</PageTitle.Header>
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
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/recipes")}>
          Cancel
        </Button>
        <Button variant="contained" disabled={saving} onClick={() => void handleSave()}>
          Save Recipe
        </Button>
      </Stack>
    </PageContent>
  );
}
