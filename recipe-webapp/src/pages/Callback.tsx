import { useEffect, useState, type JSX } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

// One registered redirect URI serves both the redirect leg and the silent
// renew's hidden iframe (thunder-authentication) — signinCallback() dispatches
// both. This page renders from the promise SETTLING, never from a value.
export function CallbackPage(): JSX.Element {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    void handleCallback().finally(() => {
      if (!live) return;
      setDone(true);
      window.location.assign(window.location.origin);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Typography variant="body1" color="text.secondary">
        {done ? "Signed in — redirecting…" : "Completing sign-in…"}
      </Typography>
    </Box>
  );
}
