# Brolens — Product Vision, Technical Specification, Business Plan, and Hackathon Build Guide

> **Product tagline:** Find the cause. Reproduce the failure. Unblock the release.
>
> **Product category:** Cloud-based CI/CD failure intelligence and developer productivity SaaS, with Firebase Authentication and an optional Solana-based audit-proof extension.
>
> **Core promise:** Brolens turns failed CI/CD runs into evidence-backed diagnoses and reproducible debugging packs, so developers spend less time searching logs and more time shipping reliable changes.

---

## 1. Executive Summary

Brolens is a developer tool for software teams that use continuous integration and delivery (CI/CD). When a pull request or commit fails a build, test, lint, type-check, or deployment-preparation step, developers often receive a long log with little guidance about the actual cause. The error may come from application code, a test, a dependency, configuration, a runtime mismatch, or a transient infrastructure issue. Developers repeat runs, search logs manually, compare changes, and sometimes pull in a DevOps engineer before they understand what failed.

Brolens collects a failed run's available logs and metadata, identifies the most relevant failure evidence, categorizes the likely failure type, correlates it with recent code/configuration changes and previous runs when available, and generates a **Failure Reproduction Pack**. This pack includes the relevant log lines, the exact failing job and step, the environment and commit context, a clearly labeled diagnosis, reproducible commands, and recommended next checks.

Brolens is not another CI provider, code-hosting platform, general-purpose chatbot, or unrestricted auto-fix agent. It is a focused intelligence layer that works alongside existing CI tools. Its first integration target is GitHub Actions. The first release is primarily read-only: it diagnoses and explains failures, but does not automatically modify code, rerun production workflows, deploy software, or execute arbitrary repository code.

The product's primary differentiation is the end-to-end workflow:

**Failed run → evidence extraction → failure classification → change/run correlation → reproduction pack → measured engineering impact.**

The hackathon version should prove this complete loop on realistic sample data and, if time permits, a real GitHub Actions repository. The application will use Firebase Authentication for email/password and Google sign-in. An optional wallet-linked audit feature can anchor a salted commitment to a diagnosis export on Solana Devnet, so an authorized recipient can later verify that the exported report has not changed. The chain must never store wallet private keys, seed phrases, GitHub tokens, model API keys, raw CI logs, source code, or confidential report contents. The production roadmap can later add GitLab CI, CircleCI, Jenkins, team-wide failure patterns, test flakiness insights, and opt-in fix suggestions.

---

## 2. Problem Statement

### 2.1 The problem

Software teams can see that a CI/CD workflow failed, but diagnosing why it failed often requires manual work across logs, pull requests, code changes, package lockfiles, test reports, runtime versions, environment configuration, and previous pipeline runs.

This creates a recurring engineering bottleneck:

- Developers scroll through hundreds or thousands of log lines to find the first meaningful error.
- A single underlying problem can cause many downstream errors, making the last error in a log misleading.
- Teams may retry a workflow even when the failure is deterministic and caused by code or configuration.
- Teams may waste time debugging code when the actual cause is a dependency registry, network, runner, or environment issue.
- The context needed to reproduce a failure is not always captured in one place.
- Recurring failures are investigated repeatedly because teams do not have a shared, searchable history of failure fingerprints and prior diagnoses.
- DevOps/platform engineers become the escalation point for build and environment problems that individual developers cannot easily classify.
- CI reruns consume time and compute while delaying code review and merges.

### 2.2 Problem statement for a hackathon or pitch

> Developers and DevOps teams lose valuable time diagnosing failed CI/CD pipelines because logs, code changes, environment details, and failure history are disconnected. Existing CI interfaces show the failed job, but engineers still have to determine whether the cause is code, tests, dependencies, configuration, or infrastructure—and then reconstruct the steps needed to reproduce it. Brolens correlates these signals and produces evidence-backed diagnoses and reproducible debugging packs, reducing avoidable investigation and repeat work.

### 2.3 Why it matters

The cost is broader than a red build. A failed workflow can delay a pull request, block other developers, prolong a release, consume CI minutes, and interrupt a developer's current task. Across many repositories and repeated failures, small amounts of debugging time accumulate into meaningful engineering cost.

CircleCI's Q3 2026 State of Software Delivery report, based on more than 22 million workflows, reports that active feature-branch workflows grew 40% from Q1 to Q3 while main-branch workflow activity grew 17%. The report says median feature-branch failure recovery time reached about 86 minutes, up from about 80 minutes. This is a useful industry signal that more parallel development activity can create a validation and integration bottleneck. These figures are CircleCI's observations, not a guarantee that every engineering team experiences the same pattern. Source: https://circleci.com/resources/2026-state-of-software-delivery-q3-pulse/ and https://circleci.com/blog/five-takeaways-2026-q3-pulse/.

### 2.4 What Brolens is not trying to solve first

To stay feasible and differentiated, Brolens will not initially attempt to:

- Replace GitHub Actions, GitLab CI, Jenkins, CircleCI, or another CI provider.
- Replace full observability suites such as Datadog or New Relic.
- Become a generic AI code reviewer.
- Automatically commit code fixes or merge pull requests.
- Execute arbitrary build commands or customer source code inside Brolens.
- Perform production infrastructure recovery; that was the Horizon concept and is outside this product's initial scope.
- Promise that every root cause can be found automatically.
- Label a failure as “flaky” based on one failed run.

---

## 3. Product Vision and Positioning

### 3.1 Vision

Make every failed CI/CD run easier to understand, reproduce, and resolve—without requiring teams to replace their existing development infrastructure.

### 3.2 One-line pitch

**Brolens is a CI/CD failure intelligence platform that turns failed pipeline logs into evidence-backed diagnoses and reproducible debugging packs.**

### 3.3 Short project description

Brolens helps developers and DevOps teams resolve CI/CD failures faster. It analyzes build logs, test failures, workflow metadata, and relevant code or configuration changes to identify the likely failure category and highlight supporting evidence. It then generates a reproducible debugging pack containing the failing step, environment context, commands, and recommended next checks. Brolens integrates with existing CI systems instead of replacing them and measures whether it reduces diagnosis time and unnecessary reruns.

### 3.4 Positioning statement

For software teams using CI/CD who repeatedly investigate failed workflows, Brolens is a failure-intelligence layer that organizes the most relevant evidence, correlates the failure with recent changes and prior runs, and provides practical reproduction steps. Unlike a plain log viewer or generic LLM chat, Brolens combines deterministic log parsing, rule-based classification, structured AI explanations, and traceable evidence in one repeatable workflow.

### 3.5 Product principles

1. **Evidence before explanation:** Every diagnosis must link to supporting log lines, run metadata, or change context.
2. **Facts and hypotheses are separated:** The interface must distinguish observed facts from likely causes and suggestions.
3. **Reproducibility over confident wording:** A useful command and environment summary are more valuable than an unsupported “root cause found” badge.
4. **Read-only by default:** The first version observes and explains; it does not perform unreviewed changes.
5. **No execution of untrusted code:** Brolens must not run customer code in its web request handler or analysis process.
6. **Minimize repository data:** Collect and retain only what the product needs; redact secrets from logs and avoid sending full source code to an LLM by default.
7. **Make uncertainty visible:** If evidence is incomplete, Brolens should say so and request a human check.
8. **Measure value:** Track diagnosis time, recurrence, reruns, and compute usage instead of relying on subjective claims.
9. **Keep wallet secrets in the wallet:** Brolens must never request or store a MetaMask/Solana secret recovery phrase or private key. Wallet integration uses public addresses and wallet-approved signatures only.
10. **Use blockchain for proof, not secrecy:** Solana can anchor an integrity commitment for an audit export. It is not a private-key vault and does not encrypt public on-chain data.

---

## 4. Target Users and Jobs to Be Done

### 4.1 Primary customers

**Small and medium SaaS companies** that use GitHub Actions and have developers responsible for both feature work and debugging build failures.

**Software agencies and product studios** managing multiple client repositories with varied runtimes and CI configurations.

**Platform/DevOps teams** that support multiple engineering teams and want recurring CI failures to be categorized before escalation.

### 4.2 User personas

#### Persona A — Application developer
- Wants to get a pull request green and merged.
- Is comfortable reading code but does not want to manually inspect an entire CI log.
- Needs the relevant error, changed files, environment details, and next debugging step in one place.

#### Persona B — DevOps/platform engineer
- Supports many repositories and teams.
- Wants to distinguish deterministic code/test failures from infrastructure and environment failures.
- Needs recurring failure patterns, clear evidence, and fewer low-value escalations.

#### Persona C — Engineering lead/CTO
- Wants to reduce delayed merges and engineering toil.
- Needs to understand which repositories or failure categories cause the most repeated work.
- Wants measured impact before paying for another developer tool.

### 4.3 Jobs to be done

- “When my CI run fails, show me the earliest meaningful error and explain what it means.”
- “Tell me whether the evidence points toward a code, test, dependency, configuration, or infrastructure failure.”
- “Show what changed in the failing commit that may be relevant.”
- “Give me steps to reproduce the problem locally without leaking secrets.”
- “Tell me whether this resembles a previous failure.”
- “Help me understand how much time and CI compute recurring failures consume.”

---

## 5. Core Product Workflow

### Step 1 — Ingest a failed workflow

For the MVP, Brolens supports two sources:

1. **Sample/demo ingestion:** load a seeded workflow record and log artifact.
2. **GitHub Actions integration:** receive workflow webhooks, fetch permitted run/job metadata, and download logs for completed failed runs.

The app should show the repository, branch, commit SHA, workflow name, run ID, timestamps, failed job, and workflow URL.

### Step 2 — Normalize the run

Convert provider-specific information into a common internal schema:

- Repository and commit metadata.
- Workflow run and job statuses.
- Job/step names and timestamps where available.
- Runtime and environment hints from the logs/workflow metadata.
- Log chunks with stable line numbers or offsets.
- Pull request metadata and changed file paths if access is available.

Store a minimal normalized summary and the required log artifact. Apply retention rules to raw logs.

### Step 3 — Extract evidence

A deterministic parser finds candidate signals such as:

- The first failing test or assertion.
- Compiler/type-checker errors.
- Missing environment variables or configuration keys.
- Dependency resolution or package manager failures.
- Network or package-registry failures.
- Timeout, out-of-memory, disk-space, or runner errors.
- Lint and formatting failures.
- Cancellation or permission errors.

The “first meaningful error” should not blindly mean the earliest line containing the word `error`; it should be the strongest candidate based on known patterns, context, and the job's eventual status.

### Step 4 — Classify failure type

Combine deterministic rules and AI assistance. A proposed initial taxonomy:

- `test_failure`
- `build_or_compile_failure`
- `typecheck_or_lint_failure`
- `dependency_resolution_failure`
- `configuration_or_missing_secret`
- `runtime_or_environment_mismatch`
- `network_or_registry_failure`
- `resource_or_timeout_failure`
- `permission_or_access_failure`
- `workflow_configuration_failure`
- `suspected_flaky_failure`
- `unknown_or_insufficient_evidence`

The first classifier should be rules-first. AI can explain and prioritize evidence, but its output must validate against a fixed schema. A failure can have a primary category and secondary contributing factors.

### Step 5 — Correlate context

Where available, Brolens compares the failure with:

- Files changed in the associated commit or pull request.
- Lockfile/runtime/workflow changes.
- Similar failure fingerprints from previous runs.
- Previous passing runs on the same branch or commit family.
- The sequence of recent failures and successes.

The UI should say “correlated with” or “possible contributor” unless causal evidence is strong. A change occurring before a failure is not sufficient proof that it caused the failure.

### Step 6 — Generate the Failure Reproduction Pack

Every analysis should produce a structured package containing:

1. **Summary:** short explanation of the most likely failure.
2. **Classification:** category and confidence band.
3. **Observed facts:** facts directly present in run metadata or logs.
4. **Evidence:** relevant log excerpts with line number or step references.
5. **Potential contributors:** relevant files/configuration changes, when available.
6. **Reproduction steps:** commands and prerequisites inferred from the repository's package manager/workflow configuration.
7. **Next checks:** ordered debugging actions, without executing them.
8. **Uncertainty:** missing evidence and what would strengthen the diagnosis.
9. **Source links:** links to the original workflow run, job, commit, and pull request.
10. **Timestamp and analyzer version:** to make later comparisons understandable.

### Step 7 — Record outcome and measure impact

A user can mark the diagnosis as helpful/not helpful, select the actual cause after investigation, and optionally record when the issue was resolved. Brolens uses this feedback to improve team-level analytics, but should not automatically train a model on private source data without clear consent and policy.

---

## 6. Differentiation and Competitive Landscape

### 6.1 The key differentiator: Failure Reproduction Pack

Brolens should not differentiate itself with “AI summarizes logs” alone. That feature is easy to copy and overlaps with existing products.

The product should make the full reproduction workflow the primary artifact: a diagnosis grounded in log evidence, a failure category, changed-context links, environment prerequisites, exact reproducible commands, and a recorded outcome.

### 6.2 Competitive reality

There are already products in adjacent categories. Do not pitch Brolens as the world's first CI failure analyzer or claim that competitors cannot diagnose failures.

- **BuildPulse** offers CI analytics, flaky-test detection/history, test impact metrics, notifications, and other CI productivity capabilities. Its documentation describes test history, flaky-test detection, and impact metrics: https://docs.buildpulse.io/flaky-tests/overview and https://buildpulse.io/.
- **GitHub Actions** itself exposes workflow run and job details, logs, and rerun capabilities. Brolens builds on this information rather than replacing it: https://docs.github.com/en/rest/actions/workflow-runs and https://docs.github.com/en/rest/actions/workflow-jobs.
- **Observability and CI visibility tools** can offer pipeline metrics, logs, and investigation features. The Brolens scope should be narrow and interoperable, not a full observability replacement.

### 6.3 Initial product wedge

Focus on failure triage across multiple common categories—not only flaky tests. Offer a small-team-friendly route from failed build to reproducible next action, with evidence and uncertainty clearly shown. Over time, build a strong history of failure fingerprints and resolution outcomes for each team.

This is a positioning hypothesis to validate with users. Before claiming a defensible market gap, interview developers and compare Brolens directly against the features they already use.

### 6.4 Potential moat over time

- A high-quality library of normalized CI failure patterns.
- Team-specific history linking failures to verified fixes/resolution outcomes.
- Repository-specific environment and workflow context.
- Integrations into GitHub pull requests, Slack/Teams, and developer IDEs.
- Evidence and reproduction quality that engineers trust.

No one feature is guaranteed to be a moat. These advantages emerge only after the product consistently solves real failures and learns from verified outcomes.

---

## 7. MVP Scope

### 7.1 Must-have for the hackathon

1. A polished overview dashboard with recent workflow failures.
2. A failed-run detail page with log timeline and selected evidence.
3. A deterministic parser for at least four failure types.
4. AI-assisted structured diagnosis with evidence references.
5. A Failure Reproduction Pack with commands, prerequisites, and cautions.
6. A history page that groups similar failure fingerprints.
7. A simple impact view showing diagnosis time, repeat failures, and estimated CI minutes from seeded data.
8. Demo data so the full user journey is reliable even without GitHub integration or live network access.
9. Firebase Authentication with email/password and Google sign-in, including protected workspace pages.

### 7.2 Should-have if time permits

- GitHub App installation and read-only ingestion for GitHub Actions.
- Pull request changed-file context.
- Slack notification mock or webhook integration.
- Download diagnosis as Markdown.
- “Helpful / not helpful” feedback.
- Optional MetaMask Solana wallet linking and a Solana Devnet proof for a sanitized diagnosis export. This should remain an optional extension and must not delay the core failure-analysis journey.

### 7.3 Explicitly out of scope for MVP

- Arbitrary code execution or build reruns inside Brolens.
- Automatically applying code changes, committing, or merging.
- Kubernetes production access or production incident recovery.
- Full support for GitLab CI, Jenkins, CircleCI, Azure Pipelines, and all providers on day one.
- Automatic quarantining or skipping of failed tests.
- Guaranteeing causal root cause from weak evidence.
- Billing, enterprise SSO, and complex multi-tenant administration beyond a basic workspace model.
- Storing or encrypting secret recovery phrases/private keys on-chain. This is explicitly prohibited; user wallet keys remain under wallet custody.

---

## 8. Product Pages and UX Requirements

### 8.1 Landing / workspace overview

Display:
- Workspace and repository selector.
- Total runs analyzed in a selected period.
- Failed runs and most common failure categories.
- Median diagnosis time (when collected).
- Repeat-failure count.
- Recent failed runs table with status, repository, branch, category, age, and action button.

Do not show fabricated live metrics. Seed data should be labeled `Demo data` or `Sample repository`.

### 8.2 Repositories page

Display connected repositories, provider, default branch, last ingested run, permissions status, and disconnect action. In demo mode, allow selection of a seeded repository.

### 8.3 Incident / failed-run detail page

Suggested layout:
- Header: repository, workflow, run ID, branch, commit, status, link to provider.
- Summary card: probable category, confidence band, and one-sentence diagnosis.
- Evidence timeline: job/step statuses and timestamps.
- Highlighted log excerpt: source line numbers and reason for highlighting.
- Change context: changed files, lockfile/workflow changes, and relevant commit message.
- Reproduction panel: commands, environment prerequisites, caution note, copy button.
- Recommended next steps: ordered, reviewable checklist.
- Feedback: diagnosis helpful? actual cause if known.

### 8.4 Failure history page

Group incidents by fingerprint. Display occurrence count, repositories/branches where it appeared, first/last seen, prior resolved examples, and whether the same signature appeared in a successful run later. Never label a failure as flaky without evidence from multiple comparable attempts.

### 8.5 Impact analytics page

Display:
- Failing-run counts by category.
- Repeat-failure rate.
- Total or estimated CI minutes spent on repeated failures.
- Median time from failed run to user-marked resolution, if captured.
- Most frequent failure fingerprints.
- Reproduction-pack usage and user feedback.

Include clear definitions for each metric. Do not claim Brolens saved time unless a baseline or user-confirmed duration exists.

### 8.6 Settings and privacy page

Include repository permissions, data retention, log redaction status, LLM analysis opt-in/out, disconnect controls, and a way to delete stored repository data. If the optional audit-proof feature is enabled, show wallet connection status, connected Solana public address, network (Devnet in the hackathon), audit-proof status, transaction signature/explorer link, and a clear notice that public-chain metadata is visible to anyone. Never show or request a seed phrase or private key.

---

## 9. Recommended Technology Stack

### 9.1 Stack summary

| Layer | Recommendation | Purpose |
|---|---|---|
| Web app | Next.js App Router + React + TypeScript | Dashboard, product pages, server-rendered views |
| Monorepo | Turborepo + pnpm workspaces | Shared packages and repeatable builds |
| UI | Tailwind CSS or plain CSS modules, plus a consistent component library | UI consistency; choose one styling system and keep it consistent |
| Database | PostgreSQL | Workspaces, repositories, workflow runs, findings, diagnoses, feedback |
| ORM | Drizzle ORM or Prisma | Type-safe database access and migrations; select one for the project |
| Authentication | Firebase Authentication | Email/password and Google sign-in; Firebase UID is the identity anchor |
| Server-side auth verification | Firebase Admin SDK | Verify Firebase ID tokens in Next.js Route Handlers; keep Admin credentials server-only |
| Optional real-time data | Firebase Realtime Database | Only for small presence/preferences if needed; PostgreSQL remains the source of truth for Brolens product records |
| Wallet connection | MetaMask Connect Solana (`@metamask/connect-solana`) | Optional wallet linking and user-approved Solana signing; never import secret keys |
| Optional audit proof | Solana Devnet + Memo program for MVP | Anchors a salted digest of a sanitized diagnosis export; no confidential content or private keys on-chain |
| Git provider | GitHub App + GitHub REST API | Repository and GitHub Actions data access |
| Validation | Zod | Validate API payloads and AI response schemas |
| Log analysis | TypeScript deterministic parsers and regex/rule registry | Identify known error patterns and evidence snippets |
| AI | Model-provider API hidden behind a package interface | Explain evidence and generate structured debugging guidance |
| Hosting | Vercel for `apps/web` | Next.js frontend and request-driven Route Handlers |
| DB hosting | Managed PostgreSQL such as Neon or Supabase | Persist application records |
| Long-running jobs | Separate worker or managed queue when needed | Retryable processing of large log artifacts and webhook backfills |
| Monitoring | Structured server logs and error monitoring | Debug Brolens itself |

### 9.2 Hosting principle

Use Vercel to host the Next.js application and request-driven APIs. Do not design the product around a function that runs forever or processes every large log synchronously. Vercel Functions have plan- and configuration-dependent maximum execution durations; see https://vercel.com/docs/functions/configuring-functions and https://vercel.com/docs/functions/limitations. Start with small log files and bounded analysis in a request. Add a queue/worker when ingestion, retries, or log size requires durable background work.

Vercel officially supports deploying Turborepo monorepos and individual workspace apps. See https://vercel.com/docs/monorepos/turborepo.

### 9.3 Firebase Authentication and the provided Brolens Firebase project

The Brolens web app uses Firebase Authentication for user sign-up/sign-in with:

- Email and password.
- Continue with Google.
- Password reset by email.
- Email verification after email/password registration (recommended).
- Sign-out and an auth-state listener.

In the Firebase Console for project `brolens-1d0ef`, enable **Authentication → Sign-in method → Email/Password** and **Google**. Add `localhost` and the production Vercel domain under **Authentication → Settings → Authorized domains**. Configure OAuth consent/branding as needed.

#### Provided web app configuration

These are the Firebase web-app configuration values supplied for Brolens. Firebase web `apiKey` values identify the project; they are not authorization secrets by themselves. Firebase documents that access control comes from Security Rules, IAM, and App Check—not from hiding the web config. Still restrict API keys to the intended Firebase APIs and do not reuse this Firebase key for Gemini or other APIs. Source: https://firebase.google.com/docs/projects/api-keys.

Create `.env.local` in `apps/web` (or at the monorepo root if the app's environment setup loads it there):

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD02h13YYqfAo4eTy0sdbBVe89T5n5E4Mw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=brolens-1d0ef.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://brolens-1d0ef-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=brolens-1d0ef
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=brolens-1d0ef.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1010013992766
NEXT_PUBLIC_FIREBASE_APP_ID=1:1010013992766:web:80f6742a828fe216635e6f
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PXGD1TG77C

# Optional browser-wallet/audit-proof prototype; never put a private key here.
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Server-only Firebase Admin SDK values. Fill them from Firebase service-account
# credentials in the deployment secret store; never put these in NEXT_PUBLIC_* vars.
FIREBASE_ADMIN_PROJECT_ID=brolens-1d0ef
FIREBASE_ADMIN_CLIENT_EMAIL=replace-with-service-account-client-email
FIREBASE_ADMIN_PRIVATE_KEY="replace-with-server-only-private-key"
```

The Firebase web config above is public client configuration, not a private key. `FIREBASE_ADMIN_PRIVATE_KEY` is a sensitive server credential and the placeholder must be replaced only in local/deployment secrets. Do not commit an actual service-account JSON file or Admin private key to Git. Add `.env.local`, `.env.*.local`, service-account JSON files, and any real credential files to `.gitignore`; commit only `.env.example` with placeholders. On Vercel, add environment variables to the correct project/environment and redeploy after changes.

#### Firebase client initialization (`apps/web/src/lib/firebase/client.ts`)

```ts
"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const realtimeDatabase = getDatabase(firebaseApp);
```

Keep this module in client-side code where Firebase browser SDKs are used. `Realtime Database` is provisioned by this config, but PostgreSQL remains the primary Brolens data store. If RTDB is not used by a feature, do not write product data to it just because the URL exists. If Analytics is enabled, initialize `getAnalytics(firebaseApp)` only in a browser/client-only path and after checking browser support; it is not required for authentication.

#### Authentication operations

Install the Firebase client SDK in `apps/web`:

```bash
pnpm --filter web add firebase
```

Example helpers for a client component or an `auth.ts` client module:

```ts
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";

export async function registerWithEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await signOut(auth);
}
```

Firebase's official web-auth guide documents email/password and federated Google sign-in: https://firebase.google.com/docs/auth/web/start.

#### Protecting Next.js APIs

Client-side Firebase Auth alone does not protect a Route Handler. For each protected API request:

1. The client gets the current Firebase user's ID token with `await user.getIdToken()`.
2. The client sends it as `Authorization: Bearer <Firebase-ID-token>` over HTTPS.
3. The server verifies it using Firebase Admin SDK `verifyIdToken()`.
4. The handler maps the verified Firebase UID to `users.firebase_uid` and checks workspace membership before reading or changing any record.

Initialize Firebase Admin in a server-only module. Never import Admin SDK credentials into a Client Component. Use a service account with the least necessary IAM permissions or supported application-default credentials. Return `401` for missing/invalid tokens and `403` for a verified user without access. All workspace-owned SQL queries must still filter by authorized workspace.

Example server-only Admin initialization (`apps/web/src/lib/firebase/admin.ts`):

```ts
import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase Admin environment variables are not configured");
}

const adminApp = getApps()[0] ?? initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

export const firebaseAdminAuth = getAuth(adminApp);

export async function verifyFirebaseBearerToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }
  const token = authorization.slice("Bearer ".length);
  return firebaseAdminAuth.verifyIdToken(token);
}
```

Call `verifyFirebaseBearerToken(request.headers.get("authorization"))` inside each protected Route Handler, then perform workspace-membership authorization. For local use, the `FIREBASE_ADMIN_PRIVATE_KEY` value may require escaped newline characters; never log this value. Prefer managed identity/secret management where supported.

#### Optional Realtime Database rules

If Brolens uses RTDB only for a user's own lightweight profile/preferences, start from a deny-by-default rule set such as the following and extend it only for intentional paths:

```json
{
  "rules": {
    "profiles": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    ".read": false,
    ".write": false
  }
}
```

Test the rules in the Firebase Emulator/Rules Playground before launch. Do not store raw CI logs, GitHub App private keys, model provider keys, or wallet secrets in a user-writable profile path.

### 9.4 GitHub integration strategy

Use a GitHub App for production repository integration. Request the minimum permissions needed for the selected functionality. For initial read-only ingestion, prefer Actions read access and only the additional metadata permissions actually required. Do not request Actions write permission unless a separate, explicit rerun feature is designed later.

GitHub's REST API supports retrieving workflow runs and job logs. The job log endpoint can return a redirect URL that expires quickly, so fetch it server-side and process it promptly. Sources: https://docs.github.com/en/rest/actions/workflow-runs and https://docs.github.com/en/rest/actions/workflow-jobs.

### 9.5 Authentication and permissions

- Firebase Authentication and GitHub App installation are separate concepts: a Brolens user signs in with Firebase, then an authorized workspace admin connects a GitHub installation.
- Users belong to workspaces through an explicit membership table.
- Every repository, run, diagnosis, audit proof, and feedback query must be scoped to a workspace the current user can access.
- Protected Route Handlers must verify Firebase ID tokens server-side with Firebase Admin SDK. Do not trust client-provided UIDs or emails.
- If using bearer ID tokens, send them over HTTPS and keep them out of logs. If the app later exchanges them for server session cookies, use `Secure`, `HttpOnly`, and appropriate `SameSite` settings.
- GitHub installation tokens must remain server-side and be short-lived where the GitHub API supports that flow.
- Never expose Firebase Admin credentials, model API keys, GitHub App private keys, database credentials, wallet secrets, or webhook secrets in browser bundles.

---

## 10. Suggested Turborepo Monorepo Structure

```text
brolens/
├── apps/
│   ├── web/                          # Next.js App Router app
│   │   ├── app/
│   │   │   ├── (marketing)/          # Landing and documentation pages
│   │   │   ├── (dashboard)/          # Authenticated workspace UI
│   │   │   │   ├── dashboard/
│   │   │   │   ├── repositories/
│   │   │   │   ├── runs/[runId]/
│   │   │   │   ├── failures/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   └── api/
│   │   │       ├── webhooks/github/route.ts
│   │   │       ├── repositories/route.ts
│   │   │       ├── runs/route.ts
│   │   │       ├── runs/[runId]/analyze/route.ts
│   │   │       ├── failures/route.ts
│   │   │       └── feedback/route.ts
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   └── worker/                        # Optional background processor
│       ├── src/
│       │   ├── index.ts
│       │   ├── jobs/
│       │   └── queue.ts
│       └── package.json
├── packages/
│   ├── ui/                            # Shared UI components
│   ├── database/                      # DB client, schema, migrations
│   ├── domain/                        # Shared types and domain rules
│   ├── github/                        # GitHub App/API client
│   ├── log-parser/                    # Deterministic parsing and fingerprinting
│   ├── classifier/                    # Rule-based category selection
│   ├── diagnosis/                     # Evidence assembly and confidence rules
│   ├── ai/                            # Provider wrapper, prompts, schemas
│   ├── security/                      # Secret redaction, auth helpers, policies
│   ├── firebase/                      # Firebase client + server-auth integration helpers
│   ├── solana-wallet/                 # Optional MetaMask Connect Solana client integration
│   ├── audit-proof/                   # Canonical report digest, proof metadata, verification
│   ├── config/                        # TypeScript, ESLint, formatting configs
│   └── fixtures/                      # Sanitized sample workflows/logs
├── docs/
│   ├── product-spec.md
│   ├── architecture.md
│   └── security.md
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

### 10.1 Monorepo conventions

- Use `pnpm` workspaces and Turborepo tasks.
- Keep domain logic in packages so it can be unit-tested without loading Next.js.
- Keep secrets and provider-specific API clients server-side.
- Use the same schema package for API input/output and database-facing domain types where appropriate.
- Add sample fixtures early; the core demonstration must work without external services.
- Keep the optional worker out of the MVP if synchronous analysis is bounded and reliable. Add it only when needed.

### 10.2 Illustrative package scripts

Root `package.json` should include scripts such as:

```json
{
  "name": "brolens",
  "private": true,
  "packageManager": "pnpm@10",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5",
    "prettier": "^3"
  }
}
```

These version ranges are illustrative. Before implementation, choose package versions compatible with the installed Node.js version and lock them through `pnpm-lock.yaml`.

---

## 11. System Architecture and Data Flow

### 11.1 High-level flow

```text
GitHub Actions workflow completes
              |
              v
      GitHub webhook event
              |
              v
  Verify webhook signature + event
              |
              v
   Store run metadata / queue job
              |
              v
 Fetch allowed job metadata and logs
              |
              v
 Secret redaction + log normalization
              |
              v
 Deterministic parser and fingerprinting
              |
              v
 Prior-run / PR-change correlation
              |
              v
 Structured AI explanation (optional)
              |
              v
 Schema validation + evidence cross-check
              |
              v
 Save diagnosis and reproduction pack
              |
              v
 Dashboard + feedback + analytics
              |
              v
 Optional: sanitize report -> salted commitment -> wallet-signed Solana Devnet memo
              |
              v
 Store transaction signature + verification metadata off-chain
```

### 11.2 Responsibilities

**Next.js web app**
- Authenticated UI and dashboard routes.
- API endpoints for repositories, runs, analyses, feedback, and webhooks.
- Authorization, input validation, and simple bounded operations.
- Initiation of an analysis job, not unrestricted execution.

**GitHub adapter**
- Verify webhook signatures.
- Deduplicate deliveries.
- Fetch workflow runs, jobs, logs, commit metadata, and changed files when permitted.
- Handle expired download URLs, rate limits, retries, and missing permissions.

**Log parser and fingerprint engine**
- Normalize provider-specific logs.
- Identify candidate evidence blocks.
- Redact secrets before storing or sending logs to an AI provider.
- Create a stable failure fingerprint from normalized signatures, error category, and relevant context; avoid hashing volatile timestamps or random values into unique fingerprints.

**Classifier**
- Use rule-based patterns first.
- Return category, matched rules, supporting evidence IDs, and a confidence band.
- Mark uncertain cases as `unknown_or_insufficient_evidence`.

**AI diagnosis module**
- Receive only the required redacted evidence and metadata.
- Summarize likely cause and generate structured next steps.
- Cite internal evidence IDs/line references; it must not fabricate line numbers or quote content that was not provided.
- Never execute a command, access secrets, or mutate repositories.

**Database**
- Persist normalized records, findings, evidence references, diagnosis output, user feedback, and analysis version.
- Enforce workspace-scoped access.

**Firebase Authentication**
- Handle email/password and Google sign-in in the Firebase client SDK.
- Verify ID tokens in server Route Handlers with Firebase Admin SDK.
- Keep the Firebase UID as the identity key and use workspace membership for product authorization.

**Optional Solana audit-proof adapter**
- Build a sanitized canonical diagnosis-export payload, add a random salt, and compute a SHA-256 commitment.
- Ask the connected wallet to sign a Solana Devnet transaction containing only a digest/version marker; use the Memo program for the MVP to avoid custom on-chain program complexity.
- Save the transaction signature, digest, export version, and salt/proof metadata off-chain under workspace authorization.
- Never send private keys, seed phrases, raw logs, diagnosis text, repository URLs, commit messages, emails, or secrets to the chain.

**Optional worker**
- Process large artifacts asynchronously.
- Retry failed provider downloads with backoff.
- Keep ingestion idempotent.
- Persist progress and failure status so jobs can resume safely.

---

## 12. Database Model

Use PostgreSQL. The schema below is a logical starting point; adapt columns and indexes during implementation.

### `users`
- `id` (UUID, primary key)
- `firebase_uid` (string, unique; Firebase Authentication UID)
- `email` (string)
- `display_name` (string, nullable)
- `email_verified` (boolean, default false)
- `created_at`, `updated_at`

Firebase is the authentication identity provider. Do not store passwords or password hashes in the Brolens database. Firebase UID maps the authenticated identity to this application record; workspace membership still controls what that user may access.

### `workspaces`
- `id` (UUID, primary key)
- `name` (string)
- `slug` (string, unique)
- `plan` (enum: `free`, `team`, `pro`, `enterprise`)
- `created_by_user_id` (FK users)
- `created_at`, `updated_at`

### `workspace_memberships`
- `workspace_id` (FK workspaces)
- `user_id` (FK users)
- `role` (enum: `owner`, `admin`, `member`, `viewer`)
- `created_at`
- Composite primary key: `(workspace_id, user_id)`

### `github_installations`
- `id` (UUID, primary key)
- `workspace_id` (FK workspaces)
- `installation_id` (string, unique)
- `account_login` (string)
- `account_type` (string)
- `permissions_json` (JSONB, sanitized)
- `connected_at`, `disconnected_at`

Do not store an installation private key in this table. Store application secrets in a managed secret store / encrypted environment configuration. Use short-lived installation tokens when interacting with the API.

### `repositories`
- `id` (UUID, primary key)
- `workspace_id` (FK workspaces)
- `github_installation_id` (FK github_installations, nullable in demo mode)
- `provider` (enum, initially `github_actions`)
- `provider_repo_id` (string)
- `owner` (string)
- `name` (string)
- `default_branch` (string, nullable)
- `is_connected` (boolean)
- `created_at`, `updated_at`
- Unique: `(workspace_id, provider, provider_repo_id)`

### `workflow_runs`
- `id` (UUID, primary key)
- `workspace_id` (FK workspaces)
- `repository_id` (FK repositories)
- `provider_run_id` (string)
- `workflow_name` (string)
- `branch` (string, nullable)
- `commit_sha` (string, nullable)
- `event_name` (string, nullable)
- `status` (string)
- `conclusion` (string, nullable)
- `html_url` (string, nullable)
- `run_started_at`, `run_completed_at`
- `head_commit_message` (text, nullable)
- `ingest_status` (enum: `pending`, `processing`, `completed`, `failed`)
- `created_at`, `updated_at`
- Unique: `(repository_id, provider_run_id)`

### `workflow_jobs`
- `id` (UUID, primary key)
- `workflow_run_id` (FK workflow_runs)
- `provider_job_id` (string)
- `name` (string)
- `status` (string)
- `conclusion` (string, nullable)
- `started_at`, `completed_at`
- `html_url` (string, nullable)
- Unique: `(workflow_run_id, provider_job_id)`

### `log_artifacts`
- `id` (UUID, primary key)
- `workflow_run_id` (FK workflow_runs)
- `workflow_job_id` (FK workflow_jobs, nullable)
- `storage_key` (string, nullable)
- `redacted_text` (text or object storage reference)
- `content_hash` (string)
- `line_count` (integer, nullable)
- `redaction_status` (string)
- `retention_until` (timestamp, nullable)
- `created_at`

Raw logs may be sensitive. Prefer encrypted storage with access controls and a defined retention period. Avoid keeping unredacted logs unless there is a clear need and explicit policy.

### `failure_fingerprints`
- `id` (UUID, primary key)
- `workspace_id` (FK workspaces)
- `repository_id` (FK repositories, nullable)
- `fingerprint` (string)
- `category` (string)
- `normalized_signature` (text)
- `first_seen_at`, `last_seen_at`
- `occurrence_count` (integer)
- `created_at`, `updated_at`
- Index: `(workspace_id, fingerprint)`

### `failure_occurrences`
- `id` (UUID, primary key)
- `fingerprint_id` (FK failure_fingerprints)
- `workflow_run_id` (FK workflow_runs)
- `workflow_job_id` (FK workflow_jobs, nullable)
- `evidence_artifact_id` (FK log_artifacts, nullable)
- `first_relevant_line` (integer, nullable)
- `created_at`
- Unique: `(fingerprint_id, workflow_run_id)`

### `diagnoses`
- `id` (UUID, primary key)
- `workspace_id` (FK workspaces)
- `workflow_run_id` (FK workflow_runs)
- `classifier_version` (string)
- `ai_model` (string, nullable)
- `primary_category` (string)
- `secondary_categories` (JSONB)
- `confidence_band` (enum: `high`, `medium`, `low`, `insufficient_evidence`)
- `summary` (text)
- `observed_facts` (JSONB)
- `hypotheses` (JSONB)
- `next_steps` (JSONB)
- `reproduction_pack` (JSONB)
- `analysis_status` (enum: `pending`, `completed`, `failed`)
- `created_at`, `updated_at`

### `diagnosis_evidence`
- `id` (UUID, primary key)
- `diagnosis_id` (FK diagnoses)
- `artifact_id` (FK log_artifacts)
- `line_start` (integer, nullable)
- `line_end` (integer, nullable)
- `excerpt` (text, redacted)
- `evidence_type` (string)
- `explanation` (text)

### `diagnosis_feedback`
- `id` (UUID, primary key)
- `diagnosis_id` (FK diagnoses)
- `user_id` (FK users)
- `was_helpful` (boolean)
- `confirmed_category` (string, nullable)
- `actual_cause` (text, nullable)
- `minutes_to_resolution` (integer, nullable)
- `created_at`

### `webhook_deliveries`
- `id` (UUID, primary key)
- `provider` (string)
- `delivery_id` (string, unique)
- `event_type` (string)
- `received_at`
- `processed_at` (nullable)
- `status` (enum: `received`, `processed`, `ignored`, `failed`)
- `error_code` (string, nullable)

### `wallet_links` (optional)
- `id` (UUID, primary key)
- `user_id` (FK users)
- `chain` (string, initially `solana`)
- `public_address` (string)
- `verified_at` (timestamp)
- `last_challenge_id` (UUID, nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`
- Unique: `(chain, public_address)` if a wallet is allowed to be linked to only one Brolens account; otherwise define an explicit account-linking policy.

Never add columns for wallet private keys, seed phrases, secret recovery phrases, or wallet passwords. Wallet linking proves ownership with a fresh, single-use challenge and a wallet signature; it does not import the wallet into Brolens.

### `wallet_challenges` (short-lived)
- `id` (UUID, primary key)
- `user_id` (FK users)
- `nonce_hash` (string, unique)
- `message` (text, challenge with app origin, Firebase UID reference, expiry and nonce)
- `expires_at` (timestamp)
- `consumed_at` (timestamp, nullable)
- `created_at`

Do not reuse a challenge. Expire it quickly and mark it consumed after verification to prevent replay.

### `audit_proofs` (optional Solana audit anchoring)
- `id` (UUID, primary key)
- `workspace_id` (FK workspaces)
- `diagnosis_id` (FK diagnoses)
- `created_by_user_id` (FK users)
- `chain_network` (string, e.g. `solana-devnet` for the prototype)
- `commitment_hash` (string, SHA-256 digest of a salted canonical export)
- `transaction_signature` (string, nullable until confirmed)
- `wallet_public_address` (string, nullable for wallet-signed transactions)
- `export_version` (integer)
- `salt_ciphertext` (text/secret-manager reference, off-chain only)
- `status` (enum: `pending`, `confirmed`, `failed`, `revoked_offchain`)
- `created_at`, `confirmed_at` (nullable)

The salt, full report, and any confidential evidence stay off-chain and are protected with normal application access controls. The chain receives only an integrity commitment and a version marker. `revoked_offchain` means the product no longer serves/endorses the report; it cannot erase an already confirmed blockchain transaction. A public proof cannot be made confidential after publication.

### Data access rules

- Every tenant-owned query must include workspace authorization.
- Do not rely only on IDs sent from the client; verify the user has access to the workspace/repository.
- Add indexes for repository + date, run conclusion + date, and fingerprint lookups.
- Use database migrations and test them from a fresh database.
- Use retention cleanup for logs and raw artifacts.

---

## 13. API Design

Example Next.js Route Handler endpoints. Exact methods and payloads should be finalized during implementation.

### Authentication and account linking
- Firebase Auth SDK handles client sign-up/sign-in; no password endpoints are needed in Brolens.
- All protected API endpoints verify Firebase ID tokens using Firebase Admin SDK.
- `POST /api/wallet/challenge` — create a short-lived one-time challenge for a signed-in user.
- `POST /api/wallet/verify` — verify the wallet message signature and link the public Solana address to the Firebase-authenticated user.
- `DELETE /api/wallet/link` — disconnect a previously linked wallet (does not change chain history).

### Optional audit-proof endpoints
- `POST /api/diagnoses/:diagnosisId/audit-proof/challenge` — create a sanitized export version and off-chain commitment payload.
- `POST /api/diagnoses/:diagnosisId/audit-proof/confirm` — store the confirmed Solana transaction signature and proof metadata after validating the expected digest/event.
- `GET /api/audit-proofs/:proofId/verify` — recompute a commitment from an authorized export and compare it with the recorded digest/transaction.

### Workspace and repositories
- `GET /api/workspaces/current` — current workspace and permissions.
- `GET /api/repositories` — list connected/demo repositories.
- `POST /api/repositories/demo` — seed a sample repository in demo mode.
- `POST /api/github/installations/sync` — synchronize repositories visible to an installation.
- `DELETE /api/repositories/:repositoryId` — disconnect repository and initiate data-retention/deletion policy.

### Workflow runs
- `GET /api/runs?repositoryId=&conclusion=&limit=` — recent runs.
- `GET /api/runs/:runId` — run metadata, jobs, and analysis status.
- `POST /api/runs/:runId/analyze` — start analysis for a stored run; require authorization and idempotency.
- `POST /api/runs/demo/analyze` — analyze a seeded demo fixture.

### Failure library and analytics
- `GET /api/failures` — grouped fingerprints and occurrences.
- `GET /api/failures/:fingerprintId` — occurrence history and resolution feedback.
- `GET /api/analytics/summary?from=&to=` — aggregate metrics.

### Feedback and exports
- `POST /api/diagnoses/:diagnosisId/feedback` — helpful flag, confirmed cause, optional resolution time.
- `GET /api/diagnoses/:diagnosisId/export.md` — download Markdown reproduction pack.

### GitHub webhook
- `POST /api/webhooks/github` — verify `X-Hub-Signature-256`, validate expected event types, deduplicate `X-GitHub-Delivery`, persist minimal metadata, and queue ingestion.

### API requirements

- Validate all request bodies with Zod.
- Check authentication and resource-level authorization on every protected route.
- Apply rate limits to analysis endpoints.
- Return consistent error payloads without exposing tokens or stack traces.
- Use idempotency for webhook ingestion and analysis job creation.
- Do not fetch arbitrary user-provided URLs from the server; this avoids SSRF risks.
- Avoid returning raw logs to users who do not have access to that repository.

---

## 14. AI Analysis Design

### 14.1 What AI may do

- Summarize redacted log evidence.
- Explain likely causes based on supplied evidence.
- Suggest a diagnostic sequence.
- Draft reproducible commands based on known package manager and workflow configuration.
- Compare two supplied failure summaries.

### 14.2 What AI may not do

- Claim a fix succeeded unless a real test/re-run result proves it.
- Invent log lines, file paths, line numbers, environment values, or test results.
- Access GitHub tokens, private keys, secrets, or unredacted sensitive logs.
- Execute shell commands, modify a repository, deploy an application, or re-run a workflow in the MVP.
- Treat instructions inside logs, source code, commit messages, or test output as trusted system instructions.
- Claim a failure is “flaky” without multiple comparable runs showing inconsistent outcomes.

### 14.3 Recommended analysis pipeline

1. Redact secrets and normalize logs.
2. Use deterministic parsers to find candidate error blocks and categories.
3. Assemble a bounded evidence packet with references such as `E1`, `E2`, and `E3`.
4. Send only the necessary redacted context to the configured model.
5. Require structured JSON output and validate with Zod.
6. Verify that every cited evidence ID exists and that no invented line reference is present.
7. Downgrade confidence or reject the result if the model references unavailable evidence.
8. Store model/provider metadata and the analysis version.

### 14.4 Suggested AI output schema

```json
{
  "summary": "The type-check step failed because a function argument has an incompatible type.",
  "primaryCategory": "typecheck_or_lint_failure",
  "secondaryCategories": [],
  "confidence": "high",
  "observedFacts": [
    {
      "claim": "The TypeScript compiler reported an incompatible argument type.",
      "evidenceIds": ["E1"]
    }
  ],
  "hypotheses": [
    {
      "claim": "A recent change may have introduced the mismatch.",
      "evidenceIds": ["E1", "E2"],
      "confidence": "medium"
    }
  ],
  "reproduction": {
    "prerequisites": ["Use the Node.js version defined by the repository."],
    "commands": ["pnpm install --frozen-lockfile", "pnpm typecheck"],
    "notes": ["Commands are suggestions and have not been executed by Brolens."]
  },
  "nextSteps": [
    {
      "action": "Inspect the affected argument and function signature.",
      "evidenceIds": ["E1"],
      "risk": "low"
    }
  ],
  "missingEvidence": []
}
```

This JSON is illustrative. Runtime commands must be inferred from actual repository files and the model output must be validated before display. Do not hardcode the example as a real diagnosis.

### 14.5 Confidence definitions

- **High:** A deterministic parser found a strong, specific error signature with direct evidence and consistent context.
- **Medium:** Evidence supports the diagnosis, but multiple explanations remain plausible.
- **Low:** A weak signal or indirect correlation suggests the category.
- **Insufficient evidence:** Available logs and metadata do not support a useful conclusion.

Confidence should reflect evidence quality, not the model's self-reported certainty.

---

## 15. Security, Privacy, and Reliability

### 15.1 Authentication and authorization

- Use secure, HTTP-only sessions.
- Enforce organization/workspace isolation on every database query.
- Apply least-privilege GitHub App permissions.
- Use server-only environment variables for credentials.
- Avoid storing long-lived access tokens when short-lived tokens can be minted as required.

### 15.2 Secret redaction

Before storing or sending logs to an AI provider, redact likely secrets such as:
- `TOKEN=...`, `API_KEY=...`, `PASSWORD=...`, `SECRET=...` patterns.
- Bearer tokens, common cloud key formats, private-key blocks, and URL credentials.
- Values masked by the CI provider should remain masked.

Redaction is imperfect. The UI should allow administrators to disable AI analysis for repositories with strict confidentiality requirements. Do not log the pre-redaction text to application logs.

### 15.3 Data retention

- Define default log retention and make it configurable by plan or workspace.
- Store only the normalized evidence needed to provide value.
- Provide repository disconnect and data deletion flows.
- Avoid sending full source files to an LLM by default. Changed file paths, diff summaries, and focused snippets are preferable when sufficient.
- Document the configured model provider's retention and data-use settings before launch.

### 15.4 Prompt-injection resistance

Build logs, commit messages, issue descriptions, and source code are untrusted data. The model prompt must explicitly say that supplied content is evidence only, not instructions. The model has no tools that can change the repository or cloud resources. Validate all output and escape displayed text.

### 15.5 Webhook security

- Verify GitHub webhook signatures using a server-side secret.
- Check event type and expected installation/repository association.
- Deduplicate delivery IDs.
- Reject oversized payloads and unsupported events.
- Do not trust repository IDs or URLs from webhook content without cross-checking the installation.

### 15.6 Firebase security

- Firebase web configuration is public client configuration. Authorization is not provided by secrecy of the Firebase `apiKey`; it is provided by Firebase Auth, Firebase Security Rules, IAM, server-side token verification, and App Check where appropriate.
- Restrict Firebase API keys to the Firebase APIs actually used. Do not allow a public Firebase key to be used as a Gemini/Generative Language API key. Use a separate restricted server-side AI provider credential.
- Enable Email/Password and Google providers explicitly in Firebase Console and set authorized domains.
- Verify Firebase ID tokens on the server for every protected Route Handler; do not trust a client-supplied UID or email.
- Do not store Firebase Admin credentials in any `NEXT_PUBLIC_*` variable or client bundle.

### 15.7 Wallet and blockchain security (important)

**Never store secret keys or seed phrases on-chain.** Solana and other public blockchains are transparent; encryption does not become safe merely because ciphertext is stored on-chain. Brolens must not ask users for a MetaMask/Solana private key, secret recovery phrase, wallet password, or JSON keystore.

- The wallet owns and uses its private key. Brolens receives only the public address, approved message signature, and/or signed transaction returned by the wallet provider.
- Use `@metamask/connect-solana` or another maintained Solana Wallet Standard integration in a Client Component. Treat wallet connection as optional and separate from Firebase login.
- Link a wallet by having the signed-in user request a nonce, sign a domain-bound, expiring message in MetaMask, and verify the signature on the server. Bind the challenge to the Firebase user/session, consume it once, and reject expired/replayed messages. The server never receives the private key.
- For a proof-of-integrity extension, canonicalize a sanitized diagnosis export, generate a fresh random salt, calculate `SHA-256(salt || canonical_export)`, and anchor only the digest/version in a Solana Devnet transaction (Memo program in the MVP). Keep the report and salt off-chain. The authorized verifier can recompute the commitment and compare it with the transaction data.
- Do not write raw logs, source code, repository names/URLs, commit messages, emails, Firebase UIDs, GitHub tokens, LLM keys, environment variables, or report text on-chain. Avoid identifiers that would reveal private repo activity.
- Tell users before sending a transaction that the digest and wallet address may be publicly visible and permanent. Use Devnet for the hackathon; production use needs a privacy review, fee model, legal review if relevant, and clear data-retention policy.
- A digest proves integrity relative to the anchored content; it does not prove that the original diagnosis is true, that the report was generated correctly, or that the underlying CI failure was interpreted correctly.
- Store any actual integration credentials in Vercel environment variables for prototypes or a managed secret manager/KMS for production. Prefer not to store per-user GitHub tokens if short-lived GitHub App installation tokens work. If encryption at rest is required, use envelope encryption with KMS and keep encryption keys outside the database and blockchain.

### 15.8 Reliability

- Use idempotent ingestion and analysis requests.
- Apply bounded retries with exponential backoff for provider rate limits and transient failures.
- Record analysis failures so users can retry without duplicating runs or occurrences.
- Use timeouts and size limits for logs and AI requests.
- If the AI provider is unavailable, still present deterministic parsing results.
- Do not block the dashboard on slow analysis; display `pending`, `processing`, `completed`, or `failed` states.

---

## 16. Failure Classification and Fingerprinting Strategy

### 16.1 Initial rule catalog

Build a small, maintainable rule registry. Example rules:

| Pattern / signal | Candidate category | Evidence to capture |
|---|---|---|
| TypeScript/Java compiler error | `build_or_compile_failure` or `typecheck_or_lint_failure` | Compiler message and file/line when present |
| Test assertion failure | `test_failure` | Test name, assertion, expected/actual values |
| `Cannot find module` / package not found | `dependency_resolution_failure` | Package name, package manager, lockfile context |
| Missing required environment key | `configuration_or_missing_secret` | Variable name only, never its value |
| Registry DNS/connection failure | `network_or_registry_failure` | Hostname and relevant error, redact credentials |
| Out-of-memory / disk-space / timeout | `resource_or_timeout_failure` | Runner/job context and duration |
| Permission denied / 401 / 403 | `permission_or_access_failure` | Resource and error code, not credentials |
| Workflow YAML syntax error | `workflow_configuration_failure` | File path and parser message |
| Cancellation without a failure signature | `unknown_or_insufficient_evidence` or cancellation subtype | Provider conclusion and cancel event |

Do not treat these patterns as exhaustive. Parsers should be versioned and tested against fixtures.

### 16.2 Fingerprint design

A normalized fingerprint can use:

- Primary failure category.
- Normalized error signature with numbers, timestamps, temporary paths, and random IDs removed where safe.
- Test name or compiler diagnostic code when available.
- Stable job/step context.

Avoid putting secret values, full code, or personal data into the fingerprint. Use a one-way hash of the normalized signature for efficient grouping.

### 16.3 Flaky-failure rules

A single failed run is not evidence of flakiness. Mark a failure as `suspected_flaky_failure` only when comparable runs show a changing result under similar code/environment conditions and the evidence supports nondeterminism. If that evidence is not available, state “possible transient failure” or “insufficient history.”

---

## 17. Evaluation Metrics and Success Criteria

### 17.1 Product metrics

- **Time to useful diagnosis:** elapsed time between failure ingestion and a diagnosis with evidence.
- **Diagnosis acceptance rate:** percentage of diagnoses users mark helpful or confirm as accurate.
- **Category accuracy:** accuracy on a labeled test fixture set.
- **Evidence precision:** percentage of highlighted evidence blocks judged relevant by a reviewer.
- **Reproduction-pack usefulness:** user feedback and proportion of packs leading to a successful local reproduction (only if recorded).
- **Repeat-failure rate:** same fingerprint occurring more than once in the chosen window.
- **Reruns per resolved failure:** track only if rerun and resolution data is available.
- **Estimated CI minutes consumed:** from provider metadata or known run duration; label estimates distinctly.
- **Ingestion latency and success rate:** webhook-to-record and record-to-analysis durations.

### 17.2 Hackathon validation plan

Create a test set of at least 15–30 known failure fixtures across different categories. For each fixture, define the correct category, the evidence lines, and an expected diagnosis. Measure how many categories are correct and whether the evidence pointers are accurate. Manually audit AI-written explanations for invented evidence.

Run a demo scenario in two modes:
1. **Manual baseline:** an engineer investigates a supplied log using the original CI output.
2. **Brolens-assisted:** the engineer uses the reproduction pack and evidence links.

Record the observed time for both, using the same scenario and operator where feasible. Do not claim a general percentage improvement from a single demo. Present it as a measured prototype result with the methodology disclosed.

### 17.3 Suggested hackathon acceptance criteria

- A seeded failed run can be opened from the dashboard.
- The parser highlights the relevant error block in the right job/step.
- The diagnosis references real evidence IDs/lines from the fixture.
- The reproduction pack shows commands and environment assumptions.
- The system clearly labels unverified hypotheses.
- At least four failure categories are covered by tested examples.
- The app still gives useful deterministic output if the AI call fails.
- No secrets from test fixtures are exposed in logs or UI.

---

## 18. Business Model and Monetization

### 18.1 Target market

Start with developer-led SaaS teams, software agencies, and startups using GitHub Actions. They have visible CI failures, limited platform engineering capacity, and a straightforward way to evaluate whether better failure triage saves developer time.

### 18.2 Pricing hypotheses

These are initial pricing assumptions for customer interviews, not verified market prices.

| Plan | Illustrative price | Possible limits and value |
|---|---:|---|
| Free / Individual | ₹0 | 1 repository, limited analyses per month, manual log upload/sample data |
| Team | ₹2,999/month | A small number of connected repositories, history, reproduction packs, shared workspace |
| Pro | ₹9,999/month | More repositories and analyses, team analytics, Slack notifications, longer retention |
| Business | Custom | SSO, advanced retention controls, custom deployment/security requirements, priority support |

Pricing may be based on active repositories, analyzed runs, retained history, or a mix. Avoid pricing solely on raw logs or tokens until actual costs are understood.

### 18.3 Revenue model

- Monthly or annual SaaS subscriptions.
- Usage-based additions for high-volume analysis after a free allowance.
- Business plans with extended retention, security controls, and support.
- Future integrations or private deployment options if real enterprise demand exists.

### 18.4 Value / ROI model

Potential engineering hours recovered per month can be estimated as:

`incidents per month × minutes saved per incident ÷ 60`

For illustration, 20 analyzed incidents per month with 15 minutes saved per incident would equal 5 engineering hours recovered. This is a scenario, not a claim of actual savings. Measure the time saved with pilot teams before using the number in sales materials.

Additional possible value includes fewer avoidable CI reruns, reduced delays to merge, and fewer escalations to platform/DevOps engineers. These must be measured rather than assumed.

### 18.5 Go-to-market strategy

1. Build a polished demo using a public sample repository and seeded failures.
2. Interview 10–15 developers and DevOps engineers who regularly use CI.
3. Offer a free pilot to small engineering teams.
4. Ask users to bring three to five recent failed runs and evaluate diagnosis/evidence quality.
5. Measure whether reproduction packs save time and whether users return for repeat failures.
6. Add integrations based on observed demand, not speculation.

### 18.6 Business risks

- **Competition:** CI observability and flaky-test analytics are established categories. Focus on cross-category failure triage and reproduction quality.
- **Trust:** Developers will stop using the product if it invents causes or cites incorrect evidence.
- **Privacy:** Build logs can contain secrets or customer information. Strong redaction and data retention controls are essential.
- **Integration cost:** Provider-specific APIs and permissions differ. Start with GitHub Actions and one clear workflow.
- **LLM cost/latency:** Use rules first, bounded context, caching, and opt-in AI analysis.
- **Adoption friction:** Keep repository installation permissions minimal and provide manual/demo ingestion without connection.

---

## 19. Development Roadmap

### Phase 0 — Product validation and UX (first)
- Conduct brief interviews with developers and DevOps engineers.
- Collect sanitized examples of common CI failures.
- Decide the first four failure categories.
- Design the failure detail page and reproduction pack.
- Confirm data privacy and repository permissions.

### Phase 1 — Hackathon MVP
- Set up Next.js + Turborepo + PostgreSQL.
- Configure Firebase Authentication for email/password and Google sign-in; verify Firebase ID tokens in server routes.
- Create demo workspace/repository and seeded workflow runs.
- Implement log parsing, category rules, evidence extraction, and fingerprints.
- Add structured AI diagnosis with schema validation.
- Build dashboard, run detail, failure history, and analytics screens.
- Add feedback and Markdown export.
- Test the complete demo journey without external API dependency.
- If time permits, add optional MetaMask Solana wallet linking and a Solana Devnet Memo proof for a sanitized export; do not block the core MVP on this extension.

### Phase 2 — GitHub Actions integration
- Create a GitHub App and webhook endpoint.
- Verify signatures and implement idempotent delivery handling.
- Fetch workflow/job metadata and logs using minimum necessary permissions.
- Add token lifecycle management, rate-limit handling, and retry strategy.
- Support repository disconnect and data deletion.

### Phase 3 — Team reliability and analytics
- Harden wallet-link challenges and the optional audit-proof verification flow if pilot users value it.
- Improve fingerprints and similarity search.
- Add confirmed-cause feedback and recurring-failure history.
- Add optional Slack notifications.
- Measure category accuracy, evidence precision, and resolution-time changes.

### Phase 4 — Expansion based on user evidence
- Add a second CI provider only if requested by pilot users.
- Consider GitLab CI, CircleCI, and Jenkins adapters.
- Add workflow configuration and runtime-version comparison.
- Add pull-request comments, subject to explicit user opt-in.
- Consider AI-generated patch suggestions only after diagnosis reliability is established. Keep changes reviewable and never auto-merge by default.

---

## 20. Hackathon Demo Script (3–4 Minutes)

### Scenario

A developer updates a discount-calculation function in a Node.js/TypeScript repository. The pull request's CI run fails because a unit test now receives a different result than expected. The workflow contains setup, install, type-check, and test steps.

### Demo sequence

1. **Open the Brolens dashboard.** Show a failed run in the recent runs list.
2. **Open the run.** Brolens identifies the failed test job and jumps to the relevant assertion instead of presenting an undifferentiated wall of logs.
3. **Show the evidence.** Highlight the exact log excerpt and its source line references. Display the commit and changed file context if available.
4. **Show the diagnosis.** The app labels the category `test_failure`, gives a confidence band, and separates the observed assertion mismatch from the hypothesis about the recent change.
5. **Open the Failure Reproduction Pack.** Display runtime prerequisites, package-manager commands, the test command, and next checks. Clearly note that Brolens has not executed these commands.
6. **Show failure history.** Compare the incident with a previous test failure or open a second seeded case, such as a dependency registry timeout, to demonstrate that not all failures are code bugs.
7. **Show impact analytics.** Display repeat failures and measured/seeded CI minutes with a clear `demo data` label.
8. **End with the value.** “Brolens does not replace CI. It shortens the path from red build to evidence-backed next action.”

### Backup demo fixtures

Keep at least three offline fixtures ready:
- A deterministic test assertion failure.
- A missing configuration key.
- A dependency/network registry failure.

This makes the demo reliable even if the GitHub API, model provider, or venue internet connection fails.

---

## 21. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| AI invents a root cause | Require evidence IDs, validate output, show hypotheses separately, and use deterministic rules first |
| Logs leak secrets | Redact before persistence/LLM calls, test the redactor, limit retention, provide opt-out |
| GitHub API rate limit or permissions failure | Show integration status, retry with backoff, and keep demo/manual ingestion available |
| Huge logs exceed function/runtime limits | Bound payload sizes, extract relevant chunks, and move heavy analysis to a worker/queue |
| Wrong failure fingerprint grouping | Use normalized signatures, maintain examples, allow correction and version the fingerprint algorithm |
| A transient issue is mislabeled as flaky | Require comparable run history and varying outcomes before using the flaky label |
| User follows a harmful suggested command | No command execution in MVP; make commands suggestions, expose prerequisites and caveats |
| Product sounds too similar to competitors | Lead with the reproducible evidence pack and validate this workflow with actual users |
| Metrics overstate savings | Keep demo metrics labeled and use measured baselines before making claims |

---

## 22. Product Requirements Checklist

### Functional
- [ ] Firebase sign-up/sign-in with email/password and Google.
- [ ] Server-side Firebase ID-token verification for protected APIs.
- [ ] Workspace and repository selection.
- [ ] Demo data that works offline.
- [ ] Ingest workflow run and job metadata.
- [ ] Normalize and redact logs.
- [ ] Detect at least four failure categories.
- [ ] Extract evidence with source line references.
- [ ] Generate a structured diagnosis.
- [ ] Build a Failure Reproduction Pack.
- [ ] Group similar failures with fingerprints.
- [ ] Capture user feedback and confirmed cause.
- [ ] Show impact analytics with clear metric definitions.
- [ ] Export a diagnosis as Markdown.
- [ ] Add GitHub Actions integration when core workflow is stable.
- [ ] Optional wallet linking via a signed challenge; no wallet private key/seed phrase collection.
- [ ] Optional Solana Devnet report-integrity proof with off-chain report storage and a documented verifier.

### Non-functional
- [ ] Tenant/workspace isolation.
- [ ] Firebase Security Rules tested; API key restrictions and App Check considered.
- [ ] No secret key, seed phrase, CI token, or report body written to the blockchain.
- [ ] Server-side secret handling.
- [ ] Webhook signature verification.
- [ ] Request validation and rate limiting.
- [ ] Bounded log and request sizes.
- [ ] Retention and deletion policy.
- [ ] Safe failure if the AI provider is unavailable.
- [ ] Clear loading/error states.
- [ ] Unit tests for parsers and classification rules.
- [ ] Fixture tests for evidence references and AI output validation.
- [ ] No arbitrary code execution.
- [ ] No automatic code mutation or merging.

---

### 22.1 Authentication, wallet and blockchain implementation notes

### What “on-chain encryption” means for Brolens

Brolens will **not** encrypt and store Solana/MetaMask private keys on-chain. That design is unsafe and unnecessary. Private keys and seed phrases are the credentials that control the wallet; anyone who obtains them can control the account. A public blockchain is a permanent, globally readable data layer, not a vault. If the goal is to keep API credentials or wallet keys confidential, use wallet custody (for wallet keys) or a managed secret store/KMS with envelope encryption (for application credentials).

### Authentication and wallet linking are separate

1. The user signs in with Firebase email/password or Google.
2. From the dashboard, the user may optionally select **Connect Solana wallet**.
3. The server issues a random, short-lived one-time challenge bound to the signed-in Firebase UID and Brolens origin.
4. MetaMask Connect Solana asks the user to sign the challenge message. No blockchain transaction is required just to prove wallet ownership.
5. The server verifies the signature, address, expiry, nonce and origin, then stores only the public address plus verification metadata.
6. To anchor a specific diagnosis report, the user separately reviews and approves a Solana Devnet transaction. The app states clearly that transaction data is public.

A Firebase account does not automatically imply ownership of a connected wallet; the signed challenge proves the link. A wallet address by itself is not a secret and does not prove that the current person controls it.

### Optional Solana audit-proof flow

For an exportable diagnosis report, Brolens creates a canonical sanitized export that excludes secrets and unneeded repository metadata. The application generates a fresh random salt and calculates a commitment:

```text
commitment = SHA-256(random_salt || canonicalized_sanitized_export)
```

For the prototype, add `BROLENS_AUDIT:v1:<commitment>` to a Solana Devnet transaction using the Memo program. The user signs the transaction through MetaMask Connect Solana. After confirmation, Brolens stores the transaction signature, commitment, export version, and salt/report reference in the private database. An authorized verifier can download the report and salt, recompute the commitment, and compare it with the on-chain digest. A custom Solana program can be considered later if reports need richer on-chain states; it is not necessary for the hackathon proof-of-concept.

Server-side commitment helper example (install a deterministic canonical JSON serializer such as `canonicalize` and keep this code off the client):

```ts
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import canonicalize from "canonicalize";

export function createReportCommitment(report: unknown) {
  const canonicalJson = canonicalize(report);
  if (canonicalJson === undefined) {
    throw new Error("Report could not be canonicalized");
  }

  const salt = randomBytes(32);
  const commitment = createHash("sha256")
    .update(salt)
    .update(Buffer.from(canonicalJson, "utf8"))
    .digest("hex");

  return {
    commitment,
    saltBase64: salt.toString("base64"),
    exportVersion: 1,
  };
}
```

The function returns a random salt for server-side persistence; never send it to the chain. The application should encrypt/protect the off-chain proof metadata according to the deployment's data-security requirements and provide the report/salt only to an authorized verifier. Add unit tests proving that the same report and salt reproduce the same digest and that changing the report changes the digest.

**Privacy constraints:** Do not add the report text, raw logs, secret values, emails, Firebase UID, organization name, private repository URL, source code, or GitHub commit message to the transaction. Do not use a plain hash of a low-entropy secret as a privacy mechanism. The random salt is for commitment binding, not a replacement for encryption. If a report must remain private, keep its content off-chain and share it only through authorized Brolens access controls.

### Required implementation packages (confirm versions when installing)

- `firebase` — browser Firebase SDK.
- `firebase-admin` — server-only ID-token verification.
- `@metamask/connect-solana` — MetaMask connection/signing through the supported Solana integration.
- A canonical JSON implementation following RFC 8785 or an equivalent deterministic serialization approach, so the same report yields the same bytes before hashing.
- Node.js `crypto` on the server for cryptographic digest and random salt generation. Never implement custom cryptographic primitives.

Use the current official MetaMask/Solana documentation for exact SDK method signatures because the SDK is actively developed: https://docs.metamask.io/metamask-connect/ and https://solana.com/docs/frontend/nextjs-solana. MetaMask Connect Solana currently supports mainnet, devnet, and testnet; its documentation notes that devnet/testnet are supported only in the MetaMask browser extension, while mobile supports mainnet only. For a hackathon Devnet demo, test using the desktop extension and keep the test-network label visible: https://docs.metamask.io/metamask-connect/solana/.

---

## 23. Final Pitch

**Brolens is a CI/CD failure intelligence platform for developer teams.** It connects failed workflow logs, test results, repository changes, environment metadata, and failure history to produce evidence-backed diagnoses and reproducible debugging packs. Firebase Authentication supports email/password and Google sign-in. An optional MetaMask/Solana integration lets a user verify wallet ownership and anchor a salted integrity commitment for a sanitized diagnosis export on Solana Devnet. Brolens never stores wallet private keys or seed phrases and never puts confidential CI data on-chain. Built as a Next.js/Turborepo application and initially integrated with GitHub Actions, Brolens aims to reduce developer debugging toil and avoidable CI waste while complementing—not replacing—the tools teams already use.

### Final product principle

**Brolens is successful when a developer can move from “CI failed” to “I understand what to inspect next, and I can reproduce the failure” with less investigation.**

---

## 24. References and Research Notes

These sources support the market context and technical integration assumptions. Features and pricing in this specification are product proposals, not statements of existing capability.

1. CircleCI, *2026 State of Software Delivery: Q3 Pulse Report* — data on workflow activity, recovery times, and delivery throughput: https://circleci.com/resources/2026-state-of-software-delivery-q3-pulse/
2. CircleCI, *Five key takeaways from the State of Software Delivery Q3 Pulse report* (published October 21, 2026): https://circleci.com/blog/five-takeaways-2026-q3-pulse/
3. GitHub REST API, *Workflow runs*: https://docs.github.com/en/rest/actions/workflow-runs
4. GitHub REST API, *Workflow jobs and job logs*: https://docs.github.com/en/rest/actions/workflow-jobs
5. GitHub Docs, *Using workflow run logs*: https://docs.github.com/en/actions/how-tos/monitor-workflows/use-workflow-run-logs
6. BuildPulse, *Flaky Tests Overview*: https://docs.buildpulse.io/flaky-tests/overview
7. BuildPulse product overview: https://buildpulse.io/
8. Vercel, *Deploying Turborepo to Vercel*: https://vercel.com/docs/monorepos/turborepo
9. Vercel, *Configuring Maximum Duration for Vercel Functions*: https://vercel.com/docs/functions/configuring-functions/duration
10. Vercel, *Vercel Functions Limits*: https://vercel.com/docs/functions/limitations
11. Firebase, *Get Started with Firebase Authentication on Websites*: https://firebase.google.com/docs/auth/web/start
12. Firebase, *Learn about and manage API keys*: https://firebase.google.com/docs/projects/api-keys
13. Firebase, *Security checklist*: https://firebase.google.com/support/guides/security-checklist
14. MetaMask, *MetaMask Connect*: https://docs.metamask.io/metamask-connect/
15. MetaMask, *Connect to Solana*: https://docs.metamask.io/metamask-connect/solana/
16. Solana, *Next.js + Kit wallet integration*: https://solana.com/docs/frontend/nextjs-solana
17. Solana, *Staying Safe on Solana*: https://solana.com/learn/staying-safe-on-solana

### Naming note

“Brolens” is the requested product name for this specification. A quick web search did not establish a clearly identical CI/CD product, but this is not trademark, company-name, or domain-name clearance. Check relevant trademarks, app stores, package registries, domains, and social handles before public launch.
