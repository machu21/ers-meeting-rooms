# Elevate Remote Solution Office — AI Agent Team Directives

Welcome to the **Elevate Remote Solution Office** project. This repository utilizes a specialized multi-agent architecture to guarantee architectural rigor, responsive UI/UX excellence, secure backend and database operations, and thorough quality assurance.

---

## The Specialized Agent Team

| Role | Identifier | Core Focus | Trigger / When to Invoke |
| :--- | :--- | :--- | :--- |
| **Senior Developer** | `senior_developer` | System Architecture, Codebase Discovery, Task Decomposition, Orchestration, Review | When starting complex features, refactoring architecture, or breaking down work. **Mandate: Reads entire relevant codebase first.** |
| **Frontend Developer Designer** | `frontend_designer` | Responsive Design (Mobile/Tablet/Desktop/Ultrawide), UI/UX Polish, Tailwind, Canvas Maps, LiveKit UI | When building or modifying UI layouts, ensuring responsive styling, optimizing user experience, or adjusting animations. |
| **Backend & Security Developer** | `backend_security` | Next.js Server Actions, Route Handlers, Supabase PostgreSQL, RLS Policies, LiveKit Tokens, Gemini AI Security | When modifying schemas, writing database queries, securing API endpoints, managing tokens, or handling server-side secrets. |
| **QA Administrator** | `qa_admin` | End-to-End Verification, Responsive Breakpoint Auditing, Regression Testing, WebRTC/AI checks, Bug Triage | Before finalizing PRs or releases, validating bug fixes, running test matrices, and running lint/typechecks. |

---

## Golden Rules for Agents Working in this Repository

1. **Senior Developer Must Read Code First**:
   - The Senior Developer is strictly forbidden from planning or assigning tasks without first reading the relevant source files (`schema.sql`, `app/`, `lib/`, `components/`).
2. **Strict Responsive Standard**:
   - Every UI component modified by `frontend_designer` must be tested against Mobile (375px), Tablet (768px), and Desktop (1280px+) breakpoints. No horizontal scrolling on mobile viewports.
3. **Zero Security Regressions**:
   - Any database table added or modified by `backend_security` MUST have Supabase Row Level Security (RLS) enabled with explicit policies.
   - Server secrets (`LIVEKIT_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) must never be exposed to client components.
4. **Mandatory QA Gate**:
   - Code changes should be verified with `npm run lint` and `npx tsc --noEmit` before concluding a task.

---

## Detailed Documentation

For full usage instructions, prompt triggers, subagent workflows, and collaborative examples, refer to [docs/AGENTS_GUIDE.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/docs/AGENTS_GUIDE.md).
