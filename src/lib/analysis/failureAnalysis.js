const SECRET_PATTERNS = [
  /\b(ghp|github_pat)_[A-Za-z0-9_]{16,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY))=([^\s]+)/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const RULES = [
  {
    category: "test_failure",
    confidence: "high",
    label: "Test assertion failure",
    test: (line) => /\b(AssertionError|Expected:|Received:|FAIL .*test)/i.test(line),
    command: "pnpm test -- --runInBand",
    next: "Inspect the named test and recently changed business logic before rerunning the focused test.",
  },
  {
    category: "typecheck_or_lint_failure",
    confidence: "high",
    label: "Lint or type-check failure",
    test: (line) => /\b(ESLint|no-unused-vars|Type error|TS\d{4}|pnpm lint)\b/i.test(line),
    command: "pnpm lint",
    next: "Open the referenced file and fix the reported lint/type diagnostic without weakening the rule.",
  },
  {
    category: "dependency_resolution_failure",
    confidence: "high",
    label: "Dependency resolution failure",
    test: (line) => /\b(NO_MATCHING_VERSION|Cannot find module|ERR_PNPM|npm ERR!|lockfile)\b/i.test(line),
    command: "pnpm install --frozen-lockfile",
    next: "Check package and lockfile changes, registry access, and whether the requested package version exists.",
  },
  {
    category: "configuration_or_missing_secret",
    confidence: "high",
    label: "Missing configuration or secret",
    test: (line) => /\b(Missing required environment variable|required configuration|secret|API_KEY)\b/i.test(line),
    command: "printenv | sort",
    next: "Confirm the missing variable name in CI settings without exposing its value in logs.",
  },
];

export function redactSecrets(text) {
  return SECRET_PATTERNS.reduce((safeText, pattern) => {
    return safeText.replace(pattern, (match, prefix) => {
      if (typeof prefix === "string" && /TOKEN|SECRET|PASSWORD|API_KEY/i.test(prefix)) {
        return `${prefix}=<redacted>`;
      }
      return "<redacted-secret>";
    });
  }, text);
}

export function analyzeRun(run) {
  const redactedLog = redactSecrets(run.log);
  const lines = redactedLog.split(/\r?\n/);
  const evidence = [];
  let matchedRule = null;

  lines.forEach((line, index) => {
    const rule = RULES.find((candidate) => candidate.test(line));
    if (rule && evidence.length < 4) {
      matchedRule ??= rule;
      evidence.push({
        id: `E${evidence.length + 1}`,
        line: index + 1,
        text: line,
        reason: rule.label,
      });
    }
  });

  const rule = matchedRule ?? {
    category: "unknown_or_insufficient_evidence",
    confidence: "insufficient_evidence",
    label: "Insufficient evidence",
    command: "review the CI job log manually",
    next: "Collect the failing job log and workflow metadata before assigning a cause.",
  };

  const fingerprintSource = `${rule.category}:${evidence[0]?.text ?? run.id}`
    .replace(/[0-9a-f]{7,40}/gi, "<sha>")
    .replace(/\d+/g, "<n>");

  return {
    ...run,
    redactedLog,
    evidence,
    diagnosis: {
      primaryCategory: rule.category,
      confidence: rule.confidence,
      summary: buildSummary(rule, run, evidence),
      observedFacts: evidence.map((item) => ({
        claim: item.text,
        evidenceIds: [item.id],
      })),
      hypotheses: [
        {
          claim: `The failure is likely a ${rule.label.toLowerCase()} based on the highlighted CI evidence.`,
          evidenceIds: evidence.length ? [evidence[0].id] : [],
          confidence: rule.confidence === "high" ? "medium" : "low",
        },
      ],
      reproduction: {
        prerequisites: ["Use the repository package manager and runtime from CI.", "Do not paste secrets into local commands."],
        commands: ["pnpm install --frozen-lockfile", rule.command],
        notes: ["Brolens has not executed these commands; treat them as reviewable suggestions."],
      },
      nextSteps: [rule.next, "Compare this run with previous occurrences before labeling it flaky."],
      missingEvidence: evidence.length ? [] : ["No strong parser rule matched this log."],
      analyzerVersion: "demo-rules-v1",
    },
    fingerprint: simpleHash(fingerprintSource),
  };
}

function buildSummary(rule, run, evidence) {
  const location = evidence[0] ? `line ${evidence[0].line}` : "the supplied log";
  return `${run.repository} failed in ${run.workflow}; Brolens classified it as ${rule.category} from ${location}.`;
}

function simpleHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return `fp-${hash.toString(16).padStart(8, "0")}`;
}
