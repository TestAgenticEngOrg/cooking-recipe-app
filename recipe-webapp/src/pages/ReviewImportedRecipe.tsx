import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Chip,
  Form,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { recipeApi } from "../api";
import { CATEGORY_OPTIONS } from "../recipeConstants";
import { joinLines, linesOf } from "../textLines";
import type { ParsedDraft } from "../draftParser";

export function ReviewImportedRecipePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const draft = (location.state as { draft?: ParsedDraft } | null)?.draft ?? null;

  const [title, setTitle] = useState(draft?.title ?? "");
  const [category, setCategory] = useState(draft?.category ?? "");
  const [tags, setTags] = useState(joinLines(draft?.tags, ", "));
  const [ingredients, setIngredients] = useState(joinLines(draft?.ingredients));
  const [steps, setSteps] = useState(joinLines(draft?.steps));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Landed here with no draft to review (a reload, a typed URL) — there is
    // nothing to show, so send the Cook back to import one.
    if (!draft) navigate("/import", { replace: true });
    // Intentionally run once: the draft arrives once, via navigation state.
  }, [draft, navigate]);

  if (!draft) return <PageContent>Redirecting…</PageContent>;

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
        <PageTitle.Header>Review Extracted Recipe</PageTitle.Header>
        <PageTitle.Actions>
          <Chip label="AI Draft" color="secondary" />
        </PageTitle.Actions>
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
          Discard
        </Button>
        <Button variant="contained" disabled={saving} onClick={() => void handleSave()}>
          Save Recipe
        </Button>
      </Stack>
    </PageContent>
  );
}
