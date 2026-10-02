import { useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, PageContent, PageTitle, Stack, TextField } from "@wso2/oxygen-ui";
import { sendChatMessage } from "../agentClient";
import { parseAgentDraft } from "../draftParser";

export function ImportRecipePage(): JSX.Element {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  async function handleExtract(): Promise<void> {
    const message = url.trim() || text.trim();
    if (!message) {
      setError("Paste recipe text or a URL first.");
      return;
    }
    setExtracting(true);
    setError(null);
    try {
      const response = await sendChatMessage({ message });
      const { draft, message: agentMessage } = parseAgentDraft(response.text);
      if (!draft) {
        setError(agentMessage || "The agent could not extract a recipe from that.");
        return;
      }
      navigate("/import/review", { state: { draft } });
    } catch {
      setError("The import agent could not be reached. Try again.");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Import a Recipe</PageTitle.Header>
      </PageTitle>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Paste recipe text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={6}
          fullWidth
        />
        <TextField
          label="…or a recipe URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          fullWidth
        />
      </Stack>

      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" disabled={extracting} onClick={() => void handleExtract()}>
          Extract Recipe
        </Button>
      </Stack>
    </PageContent>
  );
}
