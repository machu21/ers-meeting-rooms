# Elevate Remote Solution Office — Agent Team User Guide

This guide explains how to use, invoke, and orchestrate the specialized AI agents configured for the **Elevate Remote Solution Office** project.

---

## 1. Introduction & Agent Architecture

To ensure high code quality, responsive design, robust security, and thorough verification, this repository provides four specialized AI agent roles:

```
                                  ┌────────────────────────┐
                                  │    User / Product      │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                                 ┌──────────────────────────┐
                                 │     Senior Developer     │
                                 │ (Reads Codebase First &  │
                                 │   Orchestrates Tasks)    │
                                 └────────────┬─────────────┘
                                              │
               ┌──────────────────────────────┼──────────────────────────────┐
               │                              │                              │
               ▼                              ▼                              ▼
 ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
 │Frontend Developer Designer│  │Backend & Security Dev     │  │     QA Administrator      │
 │ - Responsive Breakpoints  │  │ - Supabase & RLS Policies │  │ - Multi-Viewport Audits   │
 │ - Tailwind & shadcn/ui    │  │ - Server Actions & APIs   │  │ - E2E Feature Checklists  │
 │ - VirtualMap & Canvas     │  │ - LiveKit Token Security  │  │ - Lint & Typecheck Gates  │
 │ - LiveKit Video Layouts   │  │ - Gemini AI Prompt Safety │  │ - Structured Bug Reports  │
 └─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────────┬─────────────┘
               │                              │                              │
               └──────────────────────────────┼──────────────────────────────┘
                                              │
                                              ▼
                                 ┌──────────────────────────┐
                                 │ Senior Developer Review  │
                                 │  & Production Sign-off   │
                                 └──────────────────────────┘
```

---

## 2. Agent Roster & Detailed Profiles

### 1. Senior Developer (`senior_developer`)
- **Definition File**: [.agents/agents/senior_developer.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/senior_developer.md)
- **Primary Directive**: **Must read and inspect the entire relevant codebase first** before proposing architecture, designing solutions, or assigning work to other agents.
- **Responsibilities**:
  - Codebase reconnaissance: scans `schema.sql`, `app/`, `lib/supabase/`, and `components/` to understand real state.
  - Architectural design: defines data flow, boundaries between Client/Server Components, and modular separation.
  - Task decomposition: creates structured delegation packages with clear inputs, outputs, and constraints.
  - Code review & integration: reviews all PRs and diffs before final verification.

### 2. Frontend Developer Designer (`frontend_designer`)
- **Definition File**: [.agents/agents/frontend_designer.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/frontend_designer.md)
- **Primary Directive**: Deliver responsive, visually stunning, accessible, and intuitive UI/UX.
- **Responsibilities**:
  - Responsive design across viewports:
    - **Mobile (<640px)**: Collapsible navigation, full-width touch targets, single-column stacks.
    - **Tablet (640-1024px)**: 2-column grids, adaptive sidebars, scalable video tiles.
    - **Desktop (1024-1440px)**: Multi-panel layouts (Map + Video + Chat), rich hover interactions.
    - **Ultrawide (>1440px)**: Balanced container widths preventing visual stretching.
  - Virtual Office Map: canvas scaling, player avatar rendering, proximity circles, touch navigation.
  - LiveKit UI: responsive participant grids, floating meeting controls, screen share viewer.
  - Accessibility: WCAG AA contrast compliance, keyboard focus rings, explicit `aria-label` tags.

### 3. Backend and Security Developer (`backend_security`)
- **Definition File**: [.agents/agents/backend_security.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/backend_security.md)
- **Primary Directive**: Ensure robust, high-performance backend systems with zero security flaws.
- **Responsibilities**:
  - Supabase PostgreSQL: schemas, migrations, table constraints, foreign keys (`schema.sql`).
  - Row Level Security (RLS): ensuring every table is protected by granular user/tenant policies.
  - Server Actions (`'use server'`) & API Handlers (`app/api/`): session validation via Supabase Auth, input sanitization, error masking.
  - LiveKit Security: token generation endpoint (`/api/livekit`), room authorization checks, TTL expiration.
  - AI Security: safeguarding Gemini AI actions (`ai-actions.ts`), prompt injection mitigation, clean JSON extraction.
  - Secret Protection: preventing client leakage of server-only environment variables.

### 4. QA Administrator (`qa_admin`)
- **Definition File**: [.agents/agents/qa_admin.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/qa_admin.md)
- **Primary Directive**: Defend application quality, cross-device responsiveness, and prevent regressions.
- **Responsibilities**:
  - Multi-viewport audit: verifying pages at 375px (iPhone), 768px (iPad), and 1280px+ (Desktop).
  - Feature verification:
    - Auth redirects and permission boundaries.
    - VirtualMap movement, collisions, and proximity zone triggers.
    - LiveKit audio/video join, mute, camera toggle, and room leave.
    - Transcript recording and Gemini meeting minutes summary modal.
  - Automated quality gates: running `npm run lint` and `npx tsc --noEmit`.
  - Defect reporting: structured bug templates with steps, logs, and assigned agents.

---

## 3. How to Use the Agents

### Method A: Invoking via Chat Prompt (Direct Mentions)

You can address any agent directly in your chat prompt. The agent engine will adopt that persona and its operating rules.

#### Example 1: Triggering the Senior Developer for a New Feature
> *"As the **Senior Developer**, please read the codebase first, understand how the VirtualMap and meeting-room interact, and design an implementation plan for adding a Private Booth zone with restricted access."*

#### Example 2: Triggering the Frontend Designer for Responsive Polish
> *"As the **Frontend Developer Designer**, please review `app/office/ChatPanel.tsx` and make it responsive on mobile devices (under 640px) with a slide-over drawer."*

#### Example 3: Triggering the Backend & Security Developer for Database / API
> *"As the **Backend and Security Developer**, please create a new Server Action for managing user sound preferences and write the corresponding RLS policy for Supabase."*

#### Example 4: Triggering the QA Administrator for Verification
> *"As the **QA Administrator**, please perform a responsive audit and verify the LiveKit room joining flow, then run the lint and type checks."*

---

### Method B: The Collaborative Multi-Agent Workflow

For complex tasks or large feature implementations, follow the end-to-end delegation process:

#### Step 1: Senior Developer Codebase Audit & Planning
1. Prompt the Senior Developer:
   ```text
   Senior Developer: We need to implement a "Do Not Disturb" status indicator for user avatars on the VirtualMap. Read the codebase first and create the technical breakdown.
   ```
2. The Senior Developer reads `schema.sql`, `VirtualMap.tsx`, and `profiles` table logic.
3. The Senior Developer outputs a structured specification and creates task packages for the team.

#### Step 2: Backend & Security Developer Implements the Data Layer
1. The Backend Developer takes the task package:
   ```text
   Backend Developer: Implement the 'status' column in profiles, create the RLS update policy, and export a safe Server Action to toggle DND status.
   ```
2. Implements the database updates and secure Server Action.

#### Step 3: Frontend Developer Designer Implements the UI/UX
1. The Frontend Designer takes the task package:
   ```text
   Frontend Designer: Update VirtualMap.tsx to display a subtle DND badge over avatars, and add a toggle button to OfficeNavbar.tsx that is responsive on mobile and desktop.
   ```
2. Styles the badge, adds smooth transitions, and ensures tap targets on mobile.

#### Step 4: QA Administrator Runs Audits
1. The QA Administrator receives the feature:
   ```text
   QA Administrator: Audit the DND feature on 375px mobile and 1440px desktop. Verify that toggling DND updates in real-time, check for console errors, and run 'npm run lint' and 'npx tsc --noEmit'.
   ```
2. Tests functionality, validates responsive layout, runs terminal checks, and logs any defects.

#### Step 5: Senior Developer Final Review
1. The Senior Developer reviews all modified files:
   ```text
   Senior Developer: Review all changes made for the DND feature to ensure architectural consistency, clean types, and zero regressions.
   ```
2. Signs off for merge.

---

## 4. Quality Checklist for Handoffs

Before marking any agent task as complete, verify this checklist:

| Check | Responsible Role | Pass Criteria |
| :--- | :--- | :--- |
| **Codebase Grounded** | Senior Developer | Solution references actual files and existing abstractions. |
| **Mobile Responsive** | Frontend Designer | No horizontal scrolling at 375px width; touch targets ≥ 44px. |
| **RLS Enabled** | Backend & Security | Every new table has `ENABLE ROW LEVEL SECURITY` and explicit policies. |
| **Server Secrets Guarded** | Backend & Security | No private keys exposed to client bundles or browser console. |
| **Type Check Clean** | QA Administrator | `npx tsc --noEmit` exits with 0 errors. |
| **Lint Clean** | QA Administrator | `npm run lint` passes without breaking warnings. |

---

## 5. File Location Reference

- **Agent Configurations**:
  - `senior_developer`: [.agents/agents/senior_developer.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/senior_developer.md)
  - `frontend_designer`: [.agents/agents/frontend_designer.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/frontend_designer.md)
  - `backend_security`: [.agents/agents/backend_security.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/backend_security.md)
  - `qa_admin`: [.agents/agents/qa_admin.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/agents/qa_admin.md)
- **Plugin Manifest**:
  - [.agents/plugins/ers-team/plugin.json](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/.agents/plugins/ers-team/plugin.json)
- **Project Root Directives**:
  - [AGENTS.md](file:///c:/Users/ACER.DESKTOP-FLMICGU/elevateremotesolutionoffice/AGENTS.md)
