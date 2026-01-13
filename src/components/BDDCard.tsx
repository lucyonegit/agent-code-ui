/**
 * BDDCard - Display BDD Feature and Scenario structure
 */

import { useState } from 'react';
import type { BDDFeature, BDDScenario } from '../types/events';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BDDCardProps {
  features: BDDFeature[];
}

export function BDDCard({ features }: BDDCardProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  const toggleFeature = (featureId: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const toggleScenario = (scenarioId: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else {
        next.add(scenarioId);
      }
      return next;
    });
  };

  if (!features || features.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-accent">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileCode className="h-4 w-4 text-accent" />
            <span>BDD Scenarios</span>
          </div>
          <Badge variant="secondary">{features.length} features</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-2">
        {features.map(feature => (
          <div key={feature.feature_id} className="border rounded-md overflow-hidden">
            <div 
              className="p-2 cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-between gap-2"
              onClick={() => toggleFeature(feature.feature_id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ChevronRight className={cn(
                  "h-4 w-4 flex-shrink-0 transition-transform",
                  expandedFeatures.has(feature.feature_id) && "rotate-90"
                )} />
                <span className="text-sm font-medium truncate">{feature.feature_title}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {feature.scenarios?.length || 0}
              </Badge>
            </div>
            
            {expandedFeatures.has(feature.feature_id) && (
              <div className="p-2 pt-0 bg-muted/30 space-y-2">
                <p className="text-xs text-muted-foreground px-2">{feature.description}</p>
                
                <div className="space-y-1">
                  {feature.scenarios?.map(scenario => (
                    <ScenarioItem
                      key={scenario.id}
                      scenario={scenario}
                      isExpanded={expandedScenarios.has(scenario.id)}
                      onToggle={() => toggleScenario(scenario.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface ScenarioItemProps {
  scenario: BDDScenario;
  isExpanded: boolean;
  onToggle: () => void;
}

function ScenarioItem({ scenario, isExpanded, onToggle }: ScenarioItemProps) {
  return (
    <div className="border rounded bg-background">
      <div 
        className="p-2 cursor-pointer hover:bg-accent/30 transition-colors flex items-center gap-2"
        onClick={onToggle}
      >
        <ChevronRight className={cn(
          "h-3 w-3 flex-shrink-0 transition-transform",
          isExpanded && "rotate-90"
        )} />
        <span className="text-xs font-medium">{scenario.title}</span>
      </div>
      
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2 text-xs">
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>Given</div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {scenario.given?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: 'hsl(var(--accent))' }}>When</div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {scenario.when?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: 'hsl(217 91% 60%)' }}>Then</div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {scenario.then?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
