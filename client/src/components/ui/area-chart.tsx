import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface AreaChartProps {
    data: any[];
    lines: { dataKey: string; color: string; label: string; gradientId: string }[];
    height?: number | string;
}

const CustomTooltip = ({ active, payload, label, lines }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 backdrop-blur-md p-4 border border-black/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl">
                <p className="text-[13px] font-bold text-[#1C1C1E] mb-3 tracking-tight">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => {
                        const lineConfig = lines.find((l: any) => l.dataKey === entry.dataKey);
                        const isCurrency = typeof entry.value === 'number' && entry.value > 100;
                        return (
                            <div key={index} className="flex items-center justify-between space-x-6">
                                <div className="flex items-center">
                                    <div className="w-2.5 h-2.5 rounded-full mr-2.5 shadow-sm" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[12px] font-semibold text-[#8E8E93] tracking-tight">{lineConfig?.label || entry.name}</span>
                                </div>
                                <span className="text-[12px] font-bold text-[#1C1C1E] tracking-tight">
                                    {isCurrency ? formatCurrency(entry.value || 0) : entry.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

export const AreaChart = ({ data, lines, height = 240 }: AreaChartProps) => {
    return (
        <div style={{ height, width: '100%' }} className="animate-in fade-in duration-700">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart
                    data={data}
                    margin={{ top: 20, right: 20, left: 10, bottom: 0 }}
                >
                    <defs>
                        {lines.map((line) => (
                            <linearGradient key={line.gradientId} id={line.gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={line.color} stopOpacity={0.15} />
                                <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#A2A2A7', fontSize: 10, fontWeight: 700 }}
                        dy={15}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#A2A2A7', fontSize: 10, fontWeight: 700 }}
                        tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                        dx={-10}
                    />
                    <Tooltip
                        content={(props) => <CustomTooltip {...props} lines={lines} />}
                        cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 2 }}
                        isAnimationActive={true}
                    />
                    {lines.map((line) => (
                        <Area
                            key={line.dataKey}
                            type="monotone"
                            dataKey={line.dataKey}
                            name={line.label}
                            stroke={line.color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#${line.gradientId})`}
                            activeDot={{ r: 6, strokeWidth: 0, fill: line.color, className: 'shadow-lg' }}
                            animationDuration={1500}
                        />
                    ))}
                </RechartsAreaChart>
            </ResponsiveContainer>
        </div>
    );
};
