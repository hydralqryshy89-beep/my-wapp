"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatNumber } from "@/lib/format";

interface DataPoint {
  name: string;
  spend: number;
  revenue: number;
  leads: number;
}

export function CampaignPerformanceChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">لا توجد بيانات حملات بعد.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e2e6" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b6470" }} axisLine={{ stroke: "#e8e2e6" }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b6470" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatNumber(v)}
        />
        <Tooltip
          formatter={(value) => formatNumber(Number(value))}
          cursor={{ fill: "#f2eef1" }}
          contentStyle={{ direction: "rtl", borderRadius: 8, borderColor: "#e8e2e6", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="spend" name="المصروف" fill="#b8860b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="revenue" name="الإيرادات" fill="#6e1b2e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
