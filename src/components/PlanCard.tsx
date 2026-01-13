import type { Plan } from '../types/events';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Circle, XCircle, Minus, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Circle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'skipped': return <Minus className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'done': return 'default';
      case 'in_progress': return 'secondary';
      case 'failed': return 'destructive';
      case 'skipped': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-primary" />
          <span>计划</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="text-sm">
          <span className="text-xs font-medium text-muted-foreground">目标：</span>
          <span className="ml-1">{plan.goal}</span>
        </div>

        <div className="space-y-2">
          {plan.steps.map((step, index) => (
            <div 
              key={step.id} 
              className={cn(
                "flex gap-2 p-2 rounded-md border",
                step.status === 'done' && 'bg-accent/50',
                step.status === 'in_progress' && 'bg-secondary',
                step.status === 'failed' && 'bg-destructive/10'
              )}
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{step.description}</div>
                {step.requiredTools && step.requiredTools.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {step.requiredTools.map(tool => (
                      <Badge key={tool} variant="outline" className="text-xs flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {tool}
                      </Badge>
                    ))}
                  </div>
                )}
                {step.result && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">结果：</span>
                    <span className="ml-1">{step.result.slice(0, 100)}...</span>
                  </div>
                )}
              </div>
              <Badge variant={getStatusVariant(step.status) as any} className="flex-shrink-0 h-fit">
                {getStatusIcon(step.status)}
              </Badge>
            </div>
          ))}
        </div>

        {plan.reasoning && (
          <div className="text-xs bg-muted p-2 rounded-md">
            <span className="font-medium text-muted-foreground">推理：</span>
            <span className="ml-1">{plan.reasoning}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
