import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface FinalAnswerCardProps {
  content: string;
}

export function FinalAnswerCard({ content }: FinalAnswerCardProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>答案</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="text-sm whitespace-pre-wrap">
          {content}
        </div>
      </CardContent>
    </Card>
  );
}
