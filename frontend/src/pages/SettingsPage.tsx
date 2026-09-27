import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout';
import { Sliders, Shield, Info, ArrowRight } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [spatialThreshold, setSpatialThreshold] = useState(100);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [aiDefault, setAiDefault] = useState(true);
  const [costVisible, setCostVisible] = useState(true);

  return (
    <AppShell title="Settings" subtitle="Workspace preferences & engine defaults">
      <div className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Analysis Defaults */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Sliders className="w-4 h-4 text-primary" />
              Analysis Engine Defaults
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Default Spatial Threshold</span>
                  <span className="font-mono font-bold text-primary">{spatialThreshold} m</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="500"
                  step="25"
                  value={spatialThreshold}
                  onChange={(e) => setSpatialThreshold(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pairs within this distance will trigger spatial overlap candidates.
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">Measurement Units</span>
                  <div className="text-[11px] text-muted-foreground">Distances shown in conflict cards</div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="units"
                      checked={units === 'metric'}
                      onChange={() => setUnits('metric')}
                      className="accent-primary"
                    />
                    <span>Metric (m)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="units"
                      checked={units === 'imperial'}
                      onChange={() => setUnits('imperial')}
                      className="accent-primary"
                    />
                    <span>Imperial (ft)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">AI Recommendations by Default</span>
                  <div className="text-[11px] text-muted-foreground">Automatically invoke Gemini during comparison</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiDefault}
                    onChange={(e) => setAiDefault(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">Show Cost Estimates</span>
                  <div className="text-[11px] text-muted-foreground">Display token costs in AI Control Center</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={costVisible}
                    onChange={(e) => setCostVisible(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data & Privacy & About */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Shield className="w-4 h-4 text-emerald-600" />
                Data & Privacy Controls
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI requests, token limits, model selections, and privacy mode redactions are centralized in the AI Control Center.
              </p>
              <button
                onClick={() => navigate('/ai')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                Open AI Control Center
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Info className="w-4 h-4 text-primary" />
                About GridMind
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                GridMind 1.0 · Advanced Multi-Utility Infrastructure Intelligence Platform. Built with Express, FastAPI, MongoDB, React, Leaflet, and Google Gemini Vertex AI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
