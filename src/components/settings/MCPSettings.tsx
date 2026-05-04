import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { MCPServerConfig, MCPTransportType } from "@/types";
import { Edit3Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { SettingsContent, SettingsHeader } from "./shared";

type MCPDialogState =
  | { open: false; server: null }
  | { open: true; server: MCPServerConfig | null };

type MCPFormState = {
  name: string;
  enabled: boolean;
  transportType: MCPTransportType;
  url: string;
  headersText: string;
};

const emptyForm: MCPFormState = {
  name: "",
  enabled: true,
  transportType: "http",
  url: "",
  headersText: "{}",
};

export default function MCPSettings({
  servers,
  onChange,
}: {
  servers: MCPServerConfig[];
  onChange: (servers: MCPServerConfig[]) => void;
}) {
  const [dialog, setDialog] = useState<MCPDialogState>({
    open: false,
    server: null,
  });

  const openCreate = () => setDialog({ open: true, server: null });
  const openEdit = (server: MCPServerConfig) =>
    setDialog({ open: true, server });

  const handleSave = (server: MCPServerConfig) => {
    if (dialog.server) {
      onChange(
        servers.map((item) => (item.id === server.id ? server : item)),
      );
    } else {
      onChange([...servers, server]);
    }
    setDialog({ open: false, server: null });
  };

  const handleDelete = (serverId: string) => {
    onChange(servers.filter((server) => server.id !== serverId));
  };

  const handleToggleEnabled = (serverId: string, enabled: boolean) => {
    onChange(
      servers.map((server) =>
        server.id === serverId ? { ...server, enabled } : server,
      ),
    );
  };

  return (
    <SettingsContent>
      <SettingsHeader
        title="MCP"
        action={
          <Button variant="outline" onClick={openCreate} title="新建 MCP">
            <PlusIcon className="size-4" />
            新建
          </Button>
        }
      />

      <div className="grid gap-2">
        {servers.map((server) => (
          <div
            key={server.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-medium">
                  {server.name}
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {server.transportType.toUpperCase()}
              </div>
            </div>
            <Switch
              checked={server.enabled}
              onCheckedChange={(checked) =>
                handleToggleEnabled(server.id, checked)
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(server)}
              title="编辑"
            >
              <Edit3Icon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(server.id)}
              title="删除"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}

        {servers.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            还没有 MCP 服务。
          </div>
        )}
      </div>

      <MCPServerDialog
        open={dialog.open}
        server={dialog.server}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false, server: null });
        }}
        onSave={handleSave}
      />
    </SettingsContent>
  );
}

function MCPServerDialog({
  open,
  server,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  server: MCPServerConfig | null;
  onOpenChange: (open: boolean) => void;
  onSave: (server: MCPServerConfig) => void;
}) {
  const [form, setForm] = useState<MCPFormState>(emptyForm);

  useEffect(() => {
    if (!open) return;

    setForm(
      server
        ? {
          name: server.name,
          enabled: server.enabled,
          transportType: server.transportType,
          url: server.url,
          headersText: JSON.stringify(server.headers, null, 2),
        }
        : emptyForm,
    );
  }, [open, server]);

  const handleSave = () => {
    const name = form.name.trim();
    const url = form.url.trim();
    if (!name || !url) {
      toast.error("请填写 MCP 名称和 URL");
      return;
    }

    const headers = parseHeaders(form.headersText);
    if (!headers.ok) {
      toast.error("Headers 格式错误", { description: headers.error });
      return;
    }

    onSave({
      id: server?.id ?? createMCPServerId(name),
      name,
      enabled: form.enabled,
      transportType: form.transportType,
      url,
      headers: headers.value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm font-medium">启用</div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(enabled) =>
                setForm((current) => ({ ...current, enabled }))
              }
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_160px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium">名称</span>
              <Input
                placeholder="Exa"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">类型</span>
              <Select
                value={form.transportType}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    transportType: value as MCPTransportType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium">URL</span>
            <Input
              placeholder="https://example.com/mcp"
              value={form.url}
              onChange={(event) =>
                setForm((current) => ({ ...current, url: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Headers（JSON）</span>
            <Textarea
              className="min-h-28 font-mono text-xs"
              placeholder={'{\n  "Authorization": "Bearer ..."\n}'}
              value={form.headersText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  headersText: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseHeaders(text: string):
  | { ok: true; value: Record<string, string> }
  | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: {} };

  try {
    const value = JSON.parse(trimmed) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "Headers 必须是 JSON object。" };
    }

    const entries = Object.entries(value);
    if (
      entries.some(
        ([key, headerValue]) => !key || typeof headerValue !== "string",
      )
    ) {
      return { ok: false, error: "Header 名称不能为空，值必须是字符串。" };
    }

    return {
      ok: true,
      value: Object.fromEntries(entries) as Record<string, string>,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "无法解析 JSON。",
    };
  }
}

function createMCPServerId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `mcp-${slug || "server"}-${Date.now().toString(36)}`;
}
