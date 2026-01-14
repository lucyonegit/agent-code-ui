import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { XMarkdown } from '@ant-design/x-markdown';

interface FinalAnswerCardProps {
  content: string;
}

export function FinalAnswerCard({ content }: FinalAnswerCardProps) {
  return (
    <Card className="border-l-4 border-l-primary mb-4">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>答案</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <XMarkdown content={content} />
      </CardContent>
    </Card>
  );
}
