import { BrolensDashboard } from "@/components/BrolensDashboard";
import { analyzeRun } from "@/lib/analysis/failureAnalysis";
import { demoRuns } from "@/lib/demo-data/runs";

export default function Home() {
  const analyzedRuns = demoRuns.map((run) => analyzeRun(run));

  return <BrolensDashboard runs={analyzedRuns} />;
}
