"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";

type Item = { nombre: string; unidades: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: Item }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="max-w-56 rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{item?.nombre}</p>
      <p className="mt-0.5 font-medium text-foreground">{item?.unidades} unidades vendidas</p>
    </div>
  );
}

export function TopProductsChart({ data }: { data: Item[] }) {
  const alto = Math.max(160, data.length * 44);

  return (
    <div style={{ height: alto }} className="w-full" role="img" aria-label="Productos más vendidos">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nombre"
            width={150}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }} />
          <Bar
            dataKey="unidades"
            fill="var(--raspberry)"
            radius={[0, 4, 4, 0]}
            barSize={18}
            background={{ fill: "var(--muted)", fillOpacity: 0.25, radius: 4 }}
          >
            <LabelList
              dataKey="unidades"
              position="right"
              className="fill-foreground"
              style={{ fontSize: 12, fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
