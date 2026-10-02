// GENERATED from specs/design/components/recipe-import-agent/agent.afm.md.
//
// That document declares no `x-aep.tools.openapi` block — recipe-import-agent's
// only dependency is the `cook-auth` platform-resource, which gates `/chat` at
// the gateway and is not a tool-generating `component` dependency. The
// allow-list is therefore empty: this agent reaches no operation on any other
// component. It extracts a draft from the conversation turn alone and returns
// it in `text` — the webapp calls recipe-api to persist it, never this agent.

import type { ToolSet } from "ai";

export const tools: ToolSet = {};
