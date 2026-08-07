import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import type { MCPServerConfig } from "@/types";

type MCPRuntime = {
  signature: string;
  clients: Map<string, MCPClient>;
  tools: ToolSet;
  /** 服务器配置快照，用于状态展示 */
  servers: MCPServerConfig[];
  /** 每个服务器已发现的工具名列表（用于设置页 tag 展示） */
  serverTools: Map<string, string[]>;
  /** 连接失败的服务器（失败即失败，重连需修改配置或重启） */
  failed: FailedServer[];
};

type FailedServer = {
  id: string;
  name: string;
  url: string;
  error: string;
};

export type MCPServerStatus = {
  id: string;
  name: string;
  url: string;
  status: "connected" | "failed";
  error?: string;
  /** 已发现的工具名（仅 connected 时有） */
  tools?: string[];
};

const MCP_SERVER_INIT_TIMEOUT_MS = 15_000;

const isTauriRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const mcpFetch: typeof fetch = async (input, init) => {
  if (!isTauriRuntime()) return globalThis.fetch(input, init);

  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
  return tauriFetch(input, init);
};

type PendingMCPRuntime = {
  signature: string;
  promise: Promise<MCPRuntime>;
};

let runtimePromise: PendingMCPRuntime | null = null;
let runtime: MCPRuntime | null = null;

// --- 状态订阅（供 UI 提示） ---

type MCPStatusListener = (status: MCPServerStatus[]) => void;
const statusListeners = new Set<MCPStatusListener>();

export function getMCPStatus(): MCPServerStatus[] {
  if (!runtime) return [];

  return runtime.servers.map((server) => {
    if (runtime!.clients.has(server.id)) {
      return {
        id: server.id,
        name: server.name,
        url: server.url,
        status: "connected",
        tools: runtime!.serverTools.get(server.id),
      };
    }
    const failed = runtime!.failed.find((item) => item.id === server.id);
    return {
      id: server.id,
      name: server.name,
      url: server.url,
      status: "failed",
      error: failed?.error ?? "connecting",
    };
  });
}

/** 订阅 MCP 连接状态变化，返回取消订阅函数。 */
export function onMCPStatusChange(listener: MCPStatusListener) {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function notifyMCPStatusChange() {
  const status = getMCPStatus();
  for (const listener of statusListeners) listener(status);
}

// --- 连接管理 ---

/**
 * 预热/重建 MCP 连接（应用启动、配置变化时调用）。
 * 幂等：签名相同且已连接则直接返回；连接在后台进行，不阻塞调用方。
 */
export async function initMCP(servers: MCPServerConfig[]) {
  const enabledServers = servers.filter((server) => server.enabled);
  const signature = createRuntimeSignature(enabledServers);

  if (!enabledServers.length) {
    await closeRuntime();
    return;
  }

  if (runtime?.signature === signature) return;

  if (runtimePromise?.signature !== signature) {
    runtimePromise = {
      signature,
      promise: createRuntime(enabledServers, signature),
    };
  }

  await runtimePromise.promise;
}

/**
 * 同步读取当前已注册的 MCP 工具（发消息用，不触发连接、不阻塞）。
 * 按传入的服务器配置过滤黑名单工具——工具开关实时生效，无需重连。
 */
export function getCachedMCPTools(servers: MCPServerConfig[]): ToolSet {
  const runtimeTools = runtime?.tools ?? {};

  // 收集黑名单（含重名工具的前缀注册名）
  const disabled = new Set<string>();
  for (const server of servers) {
    for (const name of server.disabledTools ?? []) {
      disabled.add(name);
      disabled.add(`${server.id}_${name}`);
    }
  }
  if (disabled.size === 0) return runtimeTools;

  const filtered: ToolSet = {};
  for (const [name, tool] of Object.entries(runtimeTools)) {
    if (!disabled.has(name)) filtered[name] = tool;
  }
  return filtered;
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
      [...previousRuntime.clients.values()].map((client) => client.close()),
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

  const clients = new Map<string, MCPClient>();
  const tools: ToolSet = {};
  const serverTools = new Map<string, string[]>();
  const failed: FailedServer[] = [];

  for (const server of servers) {
    try {
      console.info(`[MCP:${server.id}] Connecting`, {
        name: server.name,
        transportType: server.transportType,
        url: server.url,
      });

      const { client, tools: serverToolSet, toolNames } =
        await connectServer(server);
      clients.set(server.id, client);
      serverTools.set(server.id, toolNames);

      // 注册全部工具；黑名单过滤在 getCachedMCPTools 读取时进行（开关无需重连）
      for (const [toolName, toolDefinition] of Object.entries(serverToolSet)) {
        const registeredName = getRegisteredToolName(tools, server.id, toolName);
        tools[registeredName] = wrapToolForLogging(
          server.id,
          registeredName,
          toolDefinition,
        );
      }
    } catch (error) {
      console.error(`[MCP:${server.id}] Failed to initialize`, error);
      failed.push({
        id: server.id,
        name: server.name,
        url: server.url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (runtimePromise?.signature !== signature) {
    await Promise.allSettled(
      [...clients.values()].map((client) => client.close()),
    );
    return {
      signature,
      clients: new Map(),
      tools: {},
      servers,
      serverTools: new Map(),
      failed: [],
    };
  }

  runtime = {
    signature,
    clients,
    tools,
    servers,
    serverTools,
    failed,
  };
  runtimePromise = null;
  console.info("[MCP] Registered tools", {
    count: Object.keys(tools).length,
    tools: Object.keys(tools),
  });
  notifyMCPStatusChange();

  return runtime;
}

async function connectServer(server: MCPServerConfig) {
  const abortController = new AbortController();

  const client = await withTimeout(
    createMCPClient({
      name: `spark-${server.id}`,
      transport: {
        type: server.transportType,
        url: server.url,
        headers: server.headers,
        fetch: (input, init) =>
          mcpFetch(input, {
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

  const serverToolSet = client.toolsFromDefinitions(definitions);
  const toolNames = definitions.tools.map((tool) => tool.name);
  console.info(`[MCP:${server.id}] Tools discovered`, {
    count: toolNames.length,
    tools: toolNames,
  });

  return { client, tools: serverToolSet, toolNames };
}

async function closeRuntime() {
  const currentRuntime = runtime;
  runtime = null;
  runtimePromise = null;

  if (!currentRuntime) return;
  await Promise.allSettled(
    [...currentRuntime.clients.values()].map((client) => client.close()),
  );
  notifyMCPStatusChange();
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
