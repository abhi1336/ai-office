# Product team skills

Each local full-team run sends one task through these skills in order. A role receives the original request and every earlier role's handoff. The saved report keeps each role's summary and contribution so the user can review the reasoning.

| Order | Role | Skill objective | Expected contribution |
| --- | --- | --- | --- |
| 1 | Product Lead | Frame the outcome, scope, assumptions, risks, and handoffs. | Product brief and definition of done. |
| 2 | Product Manager | Turn the request into prioritized, testable requirements. | Product brief, success measures, and acceptance criteria. |
| 3 | UX Architect | Design the user journey and information structure. | Journey, states, accessibility, and recovery notes. |
| 4 | UI/UX Designer | Specify the interface and interaction behavior. | Screen, component, responsive, and accessibility specification. |
| 5 | AI Engineer | Design reliable AI behavior and data boundaries. | Data flow, guardrails, failure paths, and evaluations. |
| 6 | Software Engineer | Propose a maintainable implementation against the prior handoffs. | Implementation plan and source proposals only when requested. |
| 7 | QA Engineer | Trace criteria to concrete verification. | Test cases, coverage gaps, and release risks. |
| 8 | DevOps Engineer | Make delivery observable and reversible. | Build, configuration, deployment, monitoring, and rollback checklist. |

## Shared constraints

- Every role must distinguish assumptions from facts and ask questions only when a missing decision blocks a useful result.
- Roles do not create workspace tasks, approve work, change files, run commands, execute tests, commit, deploy, or take external actions.
- Source files remain proposals for review. QA describes checks but does not claim they ran.
- The application saves one completed team report after all eight roles finish. If a role fails, the run stops before saving. If saving fails after completion, the page retains the report and offers a save retry without another model run.
- The full run requires a user click, a running local `qwen3.5:4b` Ollama service, and the app page to remain open. It is a sequential foreground handoff, not an unattended background queue.
