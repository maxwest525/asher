import Anthropic from '@anthropic-ai/sdk';
import { env } from '@pod/tools';

/**
 * Production agent runtime. Uses the Anthropic SDK in an agentic loop:
 * the model responds, tool calls are executed, results are fed back, and
 * the loop continues until the model produces a final text response.
 */

export interface AgentDefinition<Input, Output> {
  id: string;
  description: string;
  model?: string;
  systemPrompt: string;
  buildPrompt: (input: Input) => string;
  parseOutput: (raw: string) => Output;
  /** Optional tool definitions the agent can call. */
  tools?: Anthropic.Tool[];
  /** Optional tool executor — called when the model invokes a tool. */
  executeTool?: (name: string, input: Record<string, unknown>) => Promise<unknown>;
}

export interface RunContext {
  runId: string;
}

const DEFAULT_MODEL = 'claude-opus-4-8';
const MAX_TURNS = 20;

export async function runAgent<I, O>(
  agent: AgentDefinition<I, O>,
  input: I,
  ctx: RunContext,
): Promise<O> {
  const client = new Anthropic({ apiKey: env.anthropic.apiKey });
  const model = agent.model ?? DEFAULT_MODEL;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: agent.buildPrompt(input) },
  ];

  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      system: agent.systemPrompt,
      messages,
      ...(agent.tools?.length ? { tools: agent.tools } : {}),
    });

    // Add the assistant's response to the message history.
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Extract the final text block.
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
      if (!textBlock) {
        throw new Error(`Agent "${agent.id}" (run ${ctx.runId}) returned no text on end_turn.`);
      }
      return agent.parseOutput(textBlock.text);
    }

    if (response.stop_reason === 'tool_use') {
      if (!agent.executeTool) {
        throw new Error(
          `Agent "${agent.id}" made a tool call but no executeTool handler is registered.`,
        );
      }

      // Execute all tool calls and collect results.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        let result: unknown;
        try {
          result = await agent.executeTool(block.name, block.input as Record<string, unknown>);
        } catch (err) {
          result = { error: String(err) };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // max_tokens or other stop reason — treat whatever text we have as final.
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (textBlock) return agent.parseOutput(textBlock.text);

    throw new Error(
      `Agent "${agent.id}" (run ${ctx.runId}) stopped with reason "${response.stop_reason}" and no text.`,
    );
  }

  throw new Error(`Agent "${agent.id}" (run ${ctx.runId}) exceeded MAX_TURNS (${MAX_TURNS}).`);
}
