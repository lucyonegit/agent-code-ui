/**
 * BDDPanel - BDD Scenarios Panel Component
 */

import { useState } from 'react';
import type { BDDFeature, BDDScenario } from '../types/events';
import './BDDPanel.css';

interface BDDPanelProps {
  features: BDDFeature[];
}

export function BDDPanel({ features }: BDDPanelProps) {
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

  if (features.length === 0) {
    return (
      <div className="bdd-panel">
        <div className="bdd-panel-header">
          <h3>BDD 场景</h3>
        </div>
        <div className="bdd-empty">
          <p>等待 BDD 场景生成...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bdd-panel">
      <div className="bdd-panel-header">
        <h3>BDD 场景</h3>
        <span className="feature-count">{features.length} 个功能</span>
      </div>
      <div className="bdd-panel-content">
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
              <span className="scenario-count">{feature.scenarios.length}</span>
            </div>
            
            {expandedFeatures.has(feature.feature_id) && (
              <div className="feature-body">
                <p className="feature-description">{feature.description}</p>
                <div className="scenarios-list">
                  {feature.scenarios.map(scenario => (
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
    <div className="bdd-scenario">
      <div className="scenario-header" onClick={onToggle}>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>›</span>
        <span className="scenario-title">{scenario.title}</span>
      </div>
      
      {isExpanded && (
        <div className="scenario-body">
          <div className="scenario-section given">
            <span className="section-label">假设</span>
            <ul>
              {scenario.given.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="scenario-section when">
            <span className="section-label">当</span>
            <ul>
              {scenario.when.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="scenario-section then">
            <span className="section-label">那么</span>
            <ul>
              {scenario.then.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
