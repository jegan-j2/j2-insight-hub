import { Card, CardContent } from "@/components/ui/card";
import { Phone, PhoneCall, TrendingUp, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientViewData } from "@/hooks/useClientViewData";

interface ClientKPICardsProps {
  kpis: ClientViewData["kpis"];
  onAnsweredClick: () => void;
  onDMsClick: () => void;
}

export const ClientKPICards = ({ kpis, onAnsweredClick, onDMsClick }: ClientKPICardsProps) => {
  const cards = [
    {
      title: "Total Dials",
      value: kpis.totalDials.toLocaleString(),
      icon: Phone,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      clickable: false,
      onClick: undefined,
    },
    {
      title: "Total Answered",
      value: kpis.totalAnswered.toLocaleString(),
      icon: PhoneCall,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      clickable: true,
      onClick: onAnsweredClick,
    },
    {
      title: "Answer Rate",
      value: `${kpis.answerRate}%`,
      icon: TrendingUp,
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-500/10",
      clickable: false,
      onClick: undefined,
    },
    {
      title: "DM Conversations",
      value: kpis.totalDMs.toLocaleString(),
      icon: Handshake,
      iconColor: "text-teal-600",
      iconBg: "bg-teal-600/10",
      clickable: true,
      onClick: onDMsClick,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            "bg-card/50 backdrop-blur-sm border-border",
            card.clickable && "cursor-pointer hover:shadow-elevated transition-shadow"
          )}
          onClick={card.onClick}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <div className={cn("p-2 rounded-lg", card.iconBg)}>
                <card.icon className={cn("h-5 w-5", card.iconColor)} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
