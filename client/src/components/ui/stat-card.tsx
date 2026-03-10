import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color: "blue" | "emerald" | "indigo" | "rose" | "amber" | "violet";
    isCurrency?: boolean;
    isLoading?: boolean;
}

const colorMap: Record<StatsCardProps["color"], string> = {
    blue: "bg-[#007AFF15] text-[#007AFF]",
    emerald: "bg-[#34C75915] text-[#34C759]",
    indigo: "bg-[#5856D615] text-[#5856D6]",
    rose: "bg-[#FF2D5515] text-[#FF2D55]",
    amber: "bg-[#FF950015] text-[#FF9500]",
    violet: "bg-[#AF52DE15] text-[#AF52DE]",
};

export const StatsCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    isCurrency,
    isLoading
}: StatsCardProps) => {
    if (isLoading) {
        return (
            <div className="bg-white/70 backdrop-blur-md rounded-[22px] border border-black/[0.04] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-28" />
            </div>
        );
    }

    const displayValue = isCurrency && typeof value === "number"
        ? formatCurrency(value)
        : value;

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-[22px] border border-black/[0.04] p-6 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-400 group">
            <div className="flex items-center justify-between mb-5">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-400 group-hover:scale-105",
                    colorMap[color]
                )}>
                    <Icon className="h-6 w-6 stroke-[2.25px]" />
                </div>
                {subtitle && (
                    <div className="px-2.5 py-1 bg-black/[0.03] rounded-full">
                        <p className="text-[10px] text-[#8E8E93] font-semibold tracking-tight uppercase">{subtitle}</p>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <p className="text-[14px] font-medium text-[#8E8E93] tracking-tight">{title}</p>
                <div className="flex items-baseline space-x-2">
                    <h3 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">{displayValue}</h3>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-black/[0.03] flex items-center justify-between">
                <div className="flex items-center text-[11px] text-[#A2A2A7] font-semibold tracking-tight uppercase">
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5 opacity-40" />
                    <span>vs Last Month</span>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-[#1C1C1E10]" />
            </div>
        </div>
    );
};
