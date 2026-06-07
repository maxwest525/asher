/**
 * Thin runtime wrapper for production agents.
 *
 * Production agents run in the deployed app (via Inngest), NOT in the Claude Code
 * terminal. Each agent is a typed definition; `runAgent` is where the Claude
 * Agent SDK loop gets wired in. Kept abstract so the skeleton compiles before
 * the SDK is fully integrated.
 */

export interface AgentDefinition<Input, Output> {
  /** Stable id, e.g. "niche-research-agent". */
  id: string;
  /** One-line description of the agent's job. */
  description: string;
  /** The model to drive this agent (defaults applied by the runner). */
  model?: string;
  /** System prompt for the agent loop. */
  systemPrompt: string;
  /**
   * Pure planner that turns input into the instruction for the agent loop.
   * Real tool execution happens inside the SDK loop in `runAgent`.
   */
  buildPrompt: (input: Input) => string;
  /** Parse/validate the loop's final output into the typed Output. */
  parseOutput: (raw: string) => Output;
}

export interface RunContext {
  /** Correlation id for tracing (e.g. the Inngest run id). */
  runId: string;
}

export async function runAgent<I, O>(
  agent: AgentDefinition<I, O>,
  _input: I,
  _ctx: RunContext,
): Promise<O> {
  // TODO: instantiate the Anthropic client with env.anthropic.apiKey, run the
  // Claude Agent SDK loop with `agent.systemPrompt` + `agent.buildPrompt(input)`
  // and the relevant @pod/tools as callable tools, then `agent.parseOutput(...)`.
  void agent;
  throw new Error(`runAgent not implemented for "${agent.id}"`);
}
