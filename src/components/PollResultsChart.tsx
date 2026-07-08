import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { Poll } from '../types';

interface PollResultsChartProps {
  poll: Poll;
}

export default function PollResultsChart({ poll }: PollResultsChartProps) {
  const votesMap = poll.votes || {};
  const totalVotes = (Object.values(votesMap) as number[]).reduce((a, b) => a + b, 0);

  const data = poll.options.map((option, idx) => {
    const count = votesMap[String(idx)] || 0;
    const percentage = totalVotes > 0 ? parseFloat(((count / totalVotes) * 100).toFixed(1)) : 0;
    return {
      name: option.length > 25 ? `${option.slice(0, 25)}...` : option,
      fullName: option,
      votes: count,
      percentage: percentage
    };
  });

  const COLORS = ['#f43f5e', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-xs shadow-md font-sans text-left space-y-1">
          <p className="font-extrabold text-slate-100 leading-snug">{dataPoint.fullName}</p>
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-slate-400">एकूण मते:</span>
            <span className="font-mono font-bold text-emerald-400">{dataPoint.votes} मते</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">प्रमाण:</span>
            <span className="font-mono font-bold text-rose-400">{dataPoint.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 sm:p-5">
      <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 mb-4 text-left flex items-center gap-2">
        <span className="w-1.5 h-3.5 bg-rose-500 rounded-full"></span>
        <span>मतदान विश्लेषण (Voting Chart Analysis)</span>
      </h5>
      <div className="w-full h-[200px]" id={`poll-chart-container-${poll._id}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tickFormatter={(tick) => `${tick}%`}
              stroke="#64748b"
              fontSize={10}
              fontWeight={600}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#475569"
              fontSize={11}
              fontWeight={700}
              width={100}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244, 63, 94, 0.05)' }} />
            <Bar 
              dataKey="percentage" 
              radius={[0, 8, 8, 0]}
              barSize={16}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
