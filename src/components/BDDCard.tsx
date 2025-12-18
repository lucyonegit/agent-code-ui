/**
 * BDDCard - Display BDD Feature and Scenario structure
 */

import { useState } from 'react';
import type { BDDFeature, BDDScenario } from '../types/events';
import './BDDCard.css';

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
    <div className="bdd-card">
      <div className="bdd-header">
        <span className="bdd-indicator"></span>
        <span className="bdd-title">BDD Scenarios</span>
        <span className="bdd-count">{features.length} features</span>
      </div>
      
      <div className="bdd-features">
        {features.map(feature => (
          <div key={feature.feature_id} className="bdd-feature">
            <div 
              className="feature-header"
              onClick={() => toggleFeature(feature.feature_id)}
            >
              <span className={`expand-icon ${expandedFeatures.has(feature.feature_id) ? 'expanded' : ''}`}>
                ›
              </span>
              <span className="feature-title">{feature.feature_title}</span>
              <span className="scenario-count">
                {feature.scenarios?.length || 0}
              </span>
            </div>
            
            {expandedFeatures.has(feature.feature_id) && (
              <div className="feature-content">
                <p className="feature-description">{feature.description}</p>
                
                <div className="scenarios">
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
      </div>
    </div>
  );
}

interface ScenarioItemProps {
  scenario: BDDScenario;
  isExpanded: boolean;
  onToggle: () => void;
}

function ScenarioItem({ scenario, isExpanded, onToggle }: ScenarioItemProps) {
  return (
    <div className="scenario">
      <div className="scenario-header" onClick={onToggle}>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>›</span>
        <span className="scenario-title">{scenario.title}</span>
      </div>
      
      {isExpanded && (
        <div className="scenario-content">
          <div className="gherkin-section given">
            <span className="gherkin-keyword">Given</span>
            <ul>
              {scenario.given?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div className="gherkin-section when">
            <span className="gherkin-keyword">When</span>
            <ul>
              {scenario.when?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div className="gherkin-section then">
            <span className="gherkin-keyword">Then</span>
            <ul>
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
