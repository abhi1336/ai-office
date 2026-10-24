# AI Product Office

A private product-team workspace with an interactive office, eight team roles, persistent tasks, a decision inbox, an editable handbook, and saved work history.

**Status:** supports a local Ollama team worker for automatic task handoffs, with results saved to One Inbox for your review. ChatGPT Site tools remain available in the hosted version. Local execution uses no OpenAI API key. GitHub integration is deferred.

## Stack
React 19, TypeScript, Vinext, Cloudflare Workers, Drizzle, and Cloudflare D1. The private Site authenticates the caller. ChatGPT tools use a stateless JSON-RPC endpoint at `/mcp`, with every read and write scoped to the authenticated user.

## Local setup
Use Node 22.13 or newer and pnpm.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sleepy_nuke.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_yellow_apocalypse.sql
pnpm dev
```

Apply each migration once, in order. Local preview does not create the ChatGPT Site plugin; the hosted private Site does.

## Run a task with local Ollama

1. Start Ollama and confirm `ollama list` shows `qwen3.5:4b`.
2. Start this app with `pnpm dev` and open `http://127.0.0.1:5173`.
3. Create a task with **Run the full team automatically** checked (the default). The background worker passes it through Product Manager, UX Architect, UI/UX Designer, Software Engineer, and QA Engineer in order. Watch stage progress in task details.
4. Review the final deliverable in the task and One Inbox. Tasks created with the checkbox unchecked can be run manually with **Run with Ollama**.

The app and local worker call Ollama at `http://127.0.0.1:11434`. Use `127.0.0.1` in the app address. The worker runs while `pnpm dev` and Ollama are running on your PC, even if the browser tab is closed. Existing tasks from older versions remain manual; create a new task to use automatic handoffs. The Software Engineer proposes files, and QA reviews the proposal. Generated files are **not** automatically written into your project or executed. A target project folder and isolated code execution are separate work still required to produce and test an actual app.

## Try it in ChatGPT
The **AI Product Office** app/plugin is installed in ChatGPT. If its tools are not available in this conversation, start a new ChatGPT Work chat and open it from Apps or Plugins. Open a chat, choose the model you want (for example, GPT-6 Luna if available in your model selector), then ask it to inspect the workspace, complete a task, and save the deliverable. The connector does not read your ChatGPT conversation history; it only receives explicit tool calls. Saved work appears in the task details and One Inbox for your review.

Example: “Use AI Product Office to complete the task **Write MVP acceptance criteria**. Read the handbook first, draft the acceptance criteria, and save the result for my review.”

Generated code is a proposal. The project tools do not edit repository files, run code, commit, or deploy. Approval records a task decision only.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
```

Tests cover MCP tool schemas and request validation, user-scoped tool dispatch, safe deliverable paths, delegation roles, and workspace task and review rules.

## Source map
- `app/office-app.tsx`: workspace UI
- `app/mcp/route.ts`, `lib/mcp/server.ts`: authenticated Site MCP transport and tools
- `lib/agents/`: saved deliverables and human review workflow
- `lib/workspace.ts`: data model and validated workspace actions
- `db/schema.ts`, `drizzle/`: D1 schema and migration
- `docs/architecture.md`: integration boundary and limitations
- `.github/workflows/ci.yml`: tests, typecheck, and build

## GitHub handoff
No GitHub repository was created. When you choose one, connect it separately; project tools currently save proposed files for human review without repository access.
