'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Activity,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Server,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // SVG Line Chart Mock Data (Storage in GB over time)
  const lineChartData = {
    '7d': [12.4, 12.8, 13.5, 14.1, 14.8, 15.2, 15.8],
    '30d': [
      8.2, 8.5, 9.1, 9.4, 9.8, 10.2, 10.5, 11.1, 11.4, 11.9, 12.4, 12.8, 13.5, 14.1, 14.8, 15.2,
      15.8, 16.4, 17.1, 17.5, 18.2, 18.9, 19.4, 20.1, 20.8, 21.2, 21.9, 22.4, 23.1, 23.8,
    ],
    '90d': [
      3.1, 4.2, 5.8, 7.2, 8.2, 10.5, 12.4, 14.8, 15.8, 18.2, 20.1, 21.9, 23.8, 26.2, 28.9, 31.4,
      33.8, 36.2, 38.9, 41.2,
    ],
  };

  const activeData = lineChartData[timeRange];
  const maxVal = Math.max(...activeData) * 1.1; // Add padding to top

  // Calculate coordinates for SVG Line Chart (Width: 600, Height: 200)
  const svgWidth = 600;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingY = 20;

  const points = activeData.map((val, idx) => {
    const x = paddingX + (idx * (svgWidth - paddingX * 2)) / (activeData.length - 1);
    const y = svgHeight - paddingY - (val * (svgHeight - paddingY * 2)) / maxVal;
    return { x, y, val };
  });

  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Gradient path d (closes the shape to the bottom of the chart area)
  const gradientD = `
    ${pathD}
    L ${points[points.length - 1].x} ${svgHeight - paddingY}
    L ${points[0].x} ${svgHeight - paddingY}
    Z
  `;

  // Server pings latency mock list
  const latencyMetrics = [
    { name: 'prod-web-server-01', ip: '142.250.190.46', latency: 42, status: 'ok' },
    { name: 'staging-app-02', ip: '172.217.16.14', latency: 68, status: 'ok' },
    { name: 'backup-mirror-target', ip: '216.58.216.164', latency: 120, status: 'ok' },
    { name: 'dev-sandbox-01', ip: '127.0.0.1', latency: 0, status: 'fail' },
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-6 relative">
      {/* Title */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
            <Activity className="h-5.5 w-5.5 text-primary" />
            Telemetry Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time backup health monitoring, storage growth telemetry, and target latencies.
          </p>
        </div>

        {/* Time selector */}
        <div className="flex items-center bg-secondary/80 rounded border border-border p-1 self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded text-xs font-semibold uppercase transition-colors ${
                timeRange === r
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Overview stats strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        <div className="glass-card p-5 rounded-lg flex flex-col gap-1 border border-border">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Average Success Rate</span>
          <div className="text-2xl font-black text-success">98.4%</div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-success" />
            <span>+1.2% from last month</span>
          </span>
        </div>

        <div className="glass-card p-5 rounded-lg flex flex-col gap-1 border border-border">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Storage Growth</span>
          <div className="text-2xl font-black text-foreground">
            {activeData[activeData.length - 1]} GB
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span>+{(activeData[activeData.length - 1] - activeData[0]).toFixed(1)} GB in scope</span>
          </span>
        </div>

        <div className="glass-card p-5 rounded-lg flex flex-col gap-1 border border-border">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Average Compression</span>
          <div className="text-2xl font-black text-foreground">4.2 : 1</div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <CheckCircle className="h-3 w-3 text-success" />
            <span>Zstd level 3 standard</span>
          </span>
        </div>

        <div className="glass-card p-5 rounded-lg flex flex-col gap-1 border border-border">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Deduplication Ratio</span>
          <div className="text-2xl font-black text-foreground">32.8%</div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <HardDrive className="h-3 w-3 text-primary" />
            <span>Smart block hashing active</span>
          </span>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Left: Storage Line Graph */}
        <div className="lg:col-span-2 glass-card p-6 rounded-lg border border-border space-y-4">
          <div>
            <h3 className="font-bold text-sm text-foreground">Storage Growth Trend</h3>
            <p className="text-[10px] text-muted-foreground">Cumulative backup storage volume sizes (GB)</p>
          </div>

          <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
              {/* Definitions for gradients */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const y = paddingY + p * (svgHeight - paddingY * 2);
                const val = (maxVal * (1 - p)).toFixed(1);
                return (
                  <g key={i} className="opacity-15">
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="9"
                      className="fill-muted-foreground font-mono font-normal"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area under line */}
              <path d={gradientD} fill="url(#areaGradient)" />

              {/* Line path */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
              />

              {/* Dots on line for 7d view to make it look nicer */}
              {timeRange === '7d' &&
                points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    className="fill-card stroke-primary stroke-2"
                  />
                ))}
            </svg>
          </div>
        </div>

        {/* Right: Success Doughnut Graph */}
        <div className="glass-card p-6 rounded-lg border border-border flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground">Backup Status Ratio</h3>
            <p className="text-[10px] text-muted-foreground">Historical backup jobs execution statuses</p>
          </div>

          <div className="flex items-center justify-center py-4 relative">
            <svg viewBox="0 0 120 120" className="h-32 w-32">
              {/* Background Circle */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="var(--secondary)"
                strokeWidth="8"
                className="opacity-40"
              />
              {/* Success arc (88% of 282.7 circumference) */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="var(--success)"
                strokeWidth="9"
                strokeDasharray="282.7"
                strokeDashoffset={282.7 * (1 - 0.94)}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              {/* Warning arc (4% offset) */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="var(--warning)"
                strokeWidth="9"
                strokeDasharray="282.7"
                strokeDashoffset={282.7 * (1 - 0.04)}
                strokeLinecap="round"
                transform={`rotate(${-90 + 360 * 0.94} 60 60)`}
              />
              {/* Error arc (2% offset) */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="var(--destructive)"
                strokeWidth="9"
                strokeDasharray="282.7"
                strokeDashoffset={282.7 * (1 - 0.02)}
                strokeLinecap="round"
                transform={`rotate(${-90 + 360 * 0.98} 60 60)`}
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-black text-foreground">94%</span>
              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider">Success</p>
            </div>
          </div>

          {/* Doughnut Legend labels */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center px-2 py-1 bg-secondary/35 rounded border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success"></span>
                <span className="font-semibold text-foreground">Completed</span>
              </div>
              <span className="font-mono text-muted-foreground">94%</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 bg-secondary/35 rounded border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-warning"></span>
                <span className="font-semibold text-foreground">Missed / Warnings</span>
              </div>
              <span className="font-mono text-muted-foreground">4%</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 bg-secondary/35 rounded border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive"></span>
                <span className="font-semibold text-foreground">Failed</span>
              </div>
              <span className="font-mono text-muted-foreground">2%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latencies table & network health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 pt-2">
        {/* Latency list */}
        <div className="lg:col-span-2 glass-card p-6 rounded-lg border border-border space-y-4">
          <div>
            <h3 className="font-bold text-sm text-foreground">Connected Target Nodes Latency</h3>
            <p className="text-[10px] text-muted-foreground">SSH handshake response times from target servers</p>
          </div>

          <div className="space-y-2">
            {latencyMetrics.map((node) => (
              <div
                key={node.name}
                className="flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-border/50 text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${node.status === 'ok' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{node.name}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{node.ip}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {node.status === 'ok' ? (
                    <div className="text-right">
                      <span className="font-mono font-bold text-foreground">{node.latency} ms</span>
                      <p className="text-[9px] text-success font-semibold uppercase tracking-wider mt-0.5">Responsive</p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="font-mono font-bold text-destructive">Offline</span>
                      <p className="text-[9px] text-destructive font-semibold uppercase tracking-wider mt-0.5">Timeout</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic logs */}
        <div className="glass-card p-6 rounded-lg border border-border flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground">System Audit Alerts</h3>
            <p className="text-[10px] text-muted-foreground">Recent telemetry logs flags needing review</p>
          </div>

          <div className="flex-1 space-y-3 pt-2">
            <div className="flex items-start gap-2.5 p-2.5 rounded bg-warning/5 border border-warning/20 text-[11px] leading-relaxed">
              <AlertTriangle className="h-4.5 w-4.5 text-warning shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-warning block">SSH Key Fingerprint warning</span>
                <span className="text-muted-foreground">Target node dev-sandbox-01 fingerprint check timed out. Network connection refused.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded bg-success/5 border border-success/20 text-[11px] leading-relaxed">
              <ShieldCheck className="h-4.5 w-4.5 text-success shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-success block">Envelope KEK rotated</span>
                <span className="text-muted-foreground">Credential store successfully audited. Vault integrity is verified.</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground text-center font-mono pt-2 border-t border-border/40">
            Telemetry service: ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
}
