'use client'

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, ResponsiveContainer
} from 'recharts';

type PatientDest = { name: string; value: number };
type StatusData = { name: string; qtd: number; fill: string };

type Props = {
  transferredData: PatientDest[];
  severityData: StatusData[];
};

const COLORS = ['#0ea5e9', '#6366f1', '#06b6d4', '#8b5cf6', '#3b82f6', '#2dd4bf'];

function CustomPieLegend({ data, total }: { data: PatientDest[]; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      {data.map((entry, index) => {
        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
        const color = COLORS[index % COLORS.length];
        const barWidth = Math.max(pct * 0.8, 4);
        return (
          <div key={entry.name} className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 10px ${color}80` }}
            />
            <div className="flex-1 text-[11px] font-black text-slate-400 truncate uppercase tracking-tighter">
              {entry.name}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="h-1 rounded-full opacity-30"
                style={{ width: `${barWidth}px`, background: color }}
              />
              <span className="text-[11px] font-black text-white min-w-[30px] text-right">
                {pct}%
              </span>
              <span className="text-[9px] font-bold text-slate-600 min-w-[20px]">
                ({entry.value})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardCharts({ transferredData, severityData }: Props) {
  const totalTransferred = transferredData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* CHART 1: Destinos de Transferência */}
      <div className="premium-card p-6 flex flex-col h-[520px]">
        <div className="mb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">
            Destino das Transferências
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
            Volume histórico acumulado (30 dias)
          </p>
        </div>

        {transferredData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-20">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-500">
              ?
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aguardando dados...</p>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transferredData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {transferredData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        style={{ filter: `drop-shadow(0 0 12px ${COLORS[index % COLORS.length]}40)` }}
                      />
                    ))}
                  </Pie>
                  <PieTooltip
                    contentStyle={{
                      backgroundColor: '#071826',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 overflow-y-auto custom-scrollbar pr-2 h-[180px]">
              <CustomPieLegend data={transferredData} total={totalTransferred} />
            </div>
          </>
        )}
      </div>

      {/* CHART 2: Carga da Fila */}
      <div className="premium-card p-6 flex flex-col h-[520px]">
        <div className="mb-8">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">
            Carga da Fila Operacional
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
            Distribuição por nível de complexidade
          </p>
        </div>

        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="barOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                dy={15}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#475569' }}
              />
              <BarTooltip
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{
                  backgroundColor: '#071826',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
                itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
              />
              <Bar dataKey="qtd" radius={[8, 8, 8, 8]} barSize={60}>
                {severityData.map((entry, index) => {
                  let fill = 'url(#barBlue)';
                  if (entry.name === 'S. Vermelha') fill = 'url(#barRed)';
                  if (entry.name === 'CTI') fill = 'url(#barOrange)';
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fill}
                      style={{ filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.3))` }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 flex justify-center gap-8 border-t border-white/5 pt-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-md bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-md bg-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.4)]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monitorado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-md bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.4)]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regular</span>
          </div>
        </div>
      </div>
    </div>
  );
}
