import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import type { MCPServerConfig } from "@/types";

type MCPRuntime = {
  signature: string;
  clients: MCPClient[];
  tools: ToolSet;
};

const MCP_SERVER_INIT_TIMEOUT_MS = 15_000;

type PendingMCPRuntime = {
  signature: string;
  promise: Promise<MCPRuntime>;
};

let runtimePromise: PendingMCPRuntime | null = null;
let runtime: MCPRuntime | null = null;

export async function getEnabledMCPTools(servers: MCPServerConfig[]) {
  const enabledServers = servers.filter((server) => server.enabled);
  const signature = createRuntimeSignature(enabledServers);

  if (!enabledServers.length) {
    await closeRuntime();
    return {};
  }

  if (runtime?.signature === signature) return runtime.tools;
  if (runtimePromise?.signature !== signature) {
    runtimePromise = {
      signature,
      promise: createRuntime(enabledServers, signature),
    };
  }

  const nextRuntime = await runtimePromise.promise;
  return nextRuntime.signature === signature ? nextRuntime.tools : {};
}

export async function closeMCPRuntime() {
  await closeRuntime();
}

async function createRuntime(
  servers: MCPServerConfig[],
  signature: string,
): Promise<MCPRuntime> {
  if (runtime && runtime.signature !== signature) {
    const previousRuntime = runtime;
    runtime = null;
    await Promise.allSettled(
      previousRuntime.clients.map((client) => client.close()),
    );
  }

  console.info("[MCP] Initializing enabled servers", {
    servers: servers.map((server) => ({
      id: server.id,
      name: server.name,
      transportType: server.transportType,
      url: server.url,
    })),
  });

  const clients: MCPClient[] = [];
  const tools: ToolSet = {};

  for (const server of servers) {
    const abortController = new AbortController();
    let client: MCPClient | null = null;

    try {
      console.info(`[MCP:${server.id}] Connecting`, {
        name: server.name,
        transportType: server.transportType,
        url: server.url,
      });

      client = await withTimeout(
        createMCPClient({
          name: `spark-${server.id}`,
          transport: {
            type: server.transportType,
            url: server.url,
            headers: server.headers,
            fetch: (input, init) =>
              globalThis.fetch(input, {
                ...init,
                signal: abortController.signal,
              }),
          },
          onUncaughtError: (error) => {
            console.error(`[MCP:${server.id}] Uncaught error`, error);
          },
        }),
        MCP_SERVER_INIT_TIMEOUT_MS,
        `[MCP:${server.id}] connect timed out`,
        abortController,
      );

      const definitions = await withTimeout(
        client.listTools(),
        MCP_SERVER_INIT_TIMEOUT_MS,
        `[MCP:${server.id}] list tools timed out`,
        abortController,
      );
      clients.push(client);
      const serverTools = client.toolsFromDefinitions(definitions);
      console.info(`[MCP:${server.id}] Tools discovered`, {
        count: definitions.tools.length,
        tools: definitions.tools.map((tool) => tool.name),
      });

      for (const [toolName, toolDefinition] of Object.entries(serverTools)) {
        const registeredName = getRegisteredToolName(tools, server.id, toolName);
        tools[registeredName] = wrapToolForLogging(
          server.id,
          registeredName,
          toolDefinition,
        );
      }
    } catch (error) {
      if (client) {
        await Promise.allSettled([client.close()]);
      }
      console.error(`[MCP:${server.id}] Failed to initialize`, error);
    }
  }

  if (runtimePromise?.signature !== signature) {
    await Promise.allSettled(clients.map((client) => client.close()));
    return { signature, clients: [], tools: {} };
  }

  runtime = { signature, clients, tools };
  runtimePromise = null;
  console.info("[MCP] Registered tools", {
    count: Object.keys(tools).length,
    tools: Object.keys(tools),
  });

  return runtime;
}

async function closeRuntime() {
  const currentRuntime = runtime;
  runtime = null;
  runtimePromise = null;

  if (!currentRuntime) return;
  await Promise.allSettled(currentRuntime.clients.map((client) => client.close()));
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  abortController: AbortController,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function createRuntimeSignature(servers: MCPServerConfig[]) {
  return JSON.stringify(
    servers
      .map((server) => ({
        id: server.id,
        enabled: server.enabled,
        transportType: server.transportType,
        url: server.url,
        headers: server.headers,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
}

function getRegisteredToolName(
  tools: ToolSet,
  serverId: string,
  toolName: string,
) {
  return tools[toolName] ? `${serverId}_${toolName}` : toolName;
}

function wrapToolForLogging(
  serverId: string,
  toolName: string,
  toolDefinition: unknown,
) {
  const tool = toolDefinition as Record<string, unknown>;
  const execute = tool.execute;

  if (typeof execute !== "function") return toolDefinition as ToolSet[string];

  return {
    ...tool,
    async execute(args: unknown, options: unknown) {
      const startedAt = performance.now();
      console.info(`[MCP:${serverId}] Tool call started`, { toolName });

      try {
        const result = await execute(args, options);
        console.info(`[MCP:${serverId}] Tool call finished`, {
          toolName,
          durationMs: Math.round(performance.now() - startedAt),
        });
        return result;
      } catch (error) {
        console.error(`[MCP:${serverId}] Tool call failed`, {
          toolName,
          durationMs: Math.round(performance.now() - startedAt),
          error,
        });
        throw error;
      }
    },
  } as ToolSet[string];
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    void closeRuntime();
  });
}
