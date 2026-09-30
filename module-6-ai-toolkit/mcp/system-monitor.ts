import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadavg } from "os";
import si from "systeminformation";
import { z } from "zod";

/**
 * Read-only system-metrics MCP server backed by `systeminformation`.
 * Exposes no tools that write, kill processes, or run commands.
 */
const server = new McpServer({ name: "system-monitor", version: "1.0.0" });

const GB = 1024 ** 3;
const gb = (bytes: number) => Math.round((bytes / GB) * 100) / 100;
const pct = (n: number) => Math.round(n * 10) / 10;
const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});
const readOnly = { readOnlyHint: true, openWorldHint: false };

async function cpu() {
  const [load, info, temp] = await Promise.all([
    si.currentLoad(),
    si.cpu(),
    si.cpuTemperature(),
  ]);
  return {
    model: `${info.manufacturer} ${info.brand}`,
    cores: info.cores,
    speedGHz: info.speed,
    loadPct: pct(load.currentLoad),
    perCoreLoadPct: load.cpus.map((c) => pct(c.load)),
    temperatureC: temp.main ?? null,
  };
}

async function memory() {
  const m = await si.mem();
  return {
    totalGB: gb(m.total),
    usedGB: gb(m.active),
    availableGB: gb(m.available),
    usedPct: pct((m.active / m.total) * 100),
    swapTotalGB: gb(m.swaptotal),
    swapUsedGB: gb(m.swapused),
  };
}

async function disks() {
  const fs = await si.fsSize();
  return fs.map((d) => ({
    mount: d.mount,
    fs: d.fs,
    type: d.type,
    sizeGB: gb(d.size),
    usedGB: gb(d.used),
    usedPct: pct(d.use),
  }));
}

server.registerTool(
  "get_cpu",
  {
    description: "CPU model, overall and per-core load, and temperature",
    annotations: readOnly,
  },
  async () => json(await cpu()),
);

server.registerTool(
  "get_memory",
  { description: "RAM and swap usage in GB", annotations: readOnly },
  async () => json(await memory()),
);

server.registerTool(
  "get_disks",
  { description: "Disk usage per mounted filesystem", annotations: readOnly },
  async () => json(await disks()),
);

server.registerTool(
  "get_top_processes",
  {
    description: "Top processes sorted by CPU or memory usage",
    inputSchema: {
      limit: z.number().int().min(1).max(50).default(10),
      sortBy: z.enum(["cpu", "mem"]).default("cpu"),
    },
    annotations: readOnly,
  },
  async ({ limit, sortBy }) => {
    const { list, all, running } = await si.processes();
    const top = [...list]
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, limit)
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        user: p.user,
        cpuPct: pct(p.cpu),
        memPct: pct(p.mem),
        command: p.command,
      }));
    return json({ total: all, running, top });
  },
);

server.registerTool(
  "get_system_overview",
  {
    description: "OS, uptime, load averages, and a CPU/memory/disk summary",
    annotations: readOnly,
  },
  async () => {
    const [os, cpuData, memData, diskData] = await Promise.all([
      si.osInfo(),
      cpu(),
      memory(),
      disks(),
    ]);
    return json({
      hostname: os.hostname,
      os: `${os.distro} ${os.release} (${os.arch})`,
      kernel: os.kernel,
      uptimeHours: Math.round((si.time().uptime / 3600) * 10) / 10,
      loadAverage1m5m15m: loadavg().map((n) => Math.round(n * 100) / 100),
      cpu: cpuData,
      memory: memData,
      disks: diskData,
    });
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("system-monitor failed to start:", err);
  process.exit(1);
});
