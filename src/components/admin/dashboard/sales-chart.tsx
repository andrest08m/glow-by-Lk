"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCOP } from "@/lib/format";

type Punto = { fecha: string; total: number };

function labelDia(fecha: string) {
  const [, m, d] = fecha.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label ? labelDia(label) : ""}</p>
      <p className="mt-0.5 font-medium text-foreground">{formatCOP(Number(payload[0]?.value ?? 0))}</p>
    </div>
  );
}

export function SalesChart({ data }: { data: Punto[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Ventas por día de los últimos 30 días">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--raspberry)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--raspberry)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
          <XAxis
            dataKey="fecha"
            tickFormatter={labelDia}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            width={52}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--raspberry)"
            strokeWidth={2}
            fill="url(#ventasFill)"
            activeDot={{ r: 4, fill: "var(--raspberry)", stroke: "var(--card)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
