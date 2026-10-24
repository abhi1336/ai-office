# AI Product Office architecture

## Runtime and identity
React and TypeScript run through Vinext on Cloudflare Workers. The private Sites boundary supplies authenticated identity. API routes and MCP tools scope every workspace and run query to the authenticated user ID. D1 stores durable workspace state and saved deliverables. Browser storage is not used for project records.

Workspace writes compare a revision and conditionally update it. MCP tools operate through the same validated workspace transitions as the UI. Each workspace allows 500 tasks, 500 inbox requests, and 100 recent activity events. The UI shows the 100 most recent saved results; D1 retains older run records. This is activity history, not an immutable audit log.

## ChatGPT connection
`.openai/hosting.json` declares the `mcp` capability. The stateless JSON-RPC endpoint at `POST /mcp` supports Sites discovery and tools/list and tools/call methods. Sites authenticates calls, checks the private Site access policy, and supplies verified caller identity headers. Each tool then reads or writes only the caller’s workspace. Sites provisions the matching private ChatGPT plugin when this version is published. The current conversation may need a new chat to load the newly published tools.

The tools let ChatGPT read the workspace, read a task, create a backlog task, save a completed deliverable, and record a pending inbox decision. ChatGPT generates output in the conversation using the selected model. The Site does not receive a copy of the conversation, cannot select or verify the current model, and has no OpenAI API key. A user must ask ChatGPT to use the project tools; there is no background model worker, autonomous retry, or closed-chat execution.

## Local Ollama team runs
In local development, the task detail UI calls the Ollama HTTP API at `http://localhost:11434/api/chat` from the browser. One user action runs eight role-specific skills in sequence: Product Lead, Product Manager, UX Architect, UI/UX Designer, AI Engineer, Software Engineer, QA Engineer, and DevOps Engineer. Each prompt receives the original task and previous role contributions. The UI reports the active role and supports canceling the current call.

After all roles complete, their contributions are combined into one result and posted to `/api/local-run`. The server validates role IDs, sizes, and proposed file paths, then stores the report for human review. If saving fails, the page retains the generated report so the user can retry the save without paying for another generation. A role failure stops the run before any result is saved. This uses a local model and requires no OpenAI API key.

Runs still require a user action, an open page, and Ollama running on the same PC. The page cannot continue after it is closed. Keep Ollama bound to loopback and use the local app origin. Generated files are not written or executed; QA produces a verification plan but no tests are run by the product.

Deliverables are size-limited and validated before storage. File paths must be safe relative paths. Proposed source files are displayed and downloadable, but are never written to the repository, executed, tested, committed, or deployed. Only the Product Lead may propose specialist tasks. The Site saves completed work to a task in Review and creates a linked One Inbox approval. A current linked approval marks the task Done; declining returns it to Backlog with revision feedback. Older runs cannot override a newer result.

The connector does not expose unrelated app actions or ChatGPT conversation history. It does not automatically approve work or trigger external actions. No paid inference is initiated by the Site; model usage follows the current ChatGPT conversation and account plan.

## Deferred work
- GitHub authorization, repository synchronization, branches, commits, and pull requests
- Isolated code execution and real test runs
- Tool adapters that operate on external systems
- An unattended queue consumer and execution that resumes after the page closes
- Cross-user teams, attachments, immutable audit storage, backups, and full security hardening

The existing private audience is preserved. GitHub will be connected when the owner provides the chosen repository.
