import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout';
import { getAIStats, updateAISettings, runAITest, type AIRequestLog } from '@/api/ai';

import {
  Shield,
  Cpu,
  Eye,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Info,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function AIControlPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const [privacyMode, setPrivacyMode] = useState<'public_only' | 'redacted' | 'standard'>('public_only');
  const [lowCost, setLowCost] = useState(false);
  const [costVisible, setCostVisible] = useState(true);

  const [stats, setStats] = useState({
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalEstimatedCost: 0,
  });
  const [requests, setRequests] = useState<AIRequestLog[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getAIStats();
      if (res?.preferences) {
        setPrivacyMode(res.preferences.privacyMode || 'public_only');
        setLowCost(Boolean(res.preferences.lowCost));
        setCostVisible(res.preferences.costVisible !== false);
      }
      if (res?.stats) {
        setStats(res.stats);
      }
      if (res?.requests) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error('Failed to load AI stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrivacyChange = async (mode: 'public_only' | 'redacted' | 'standard') => {
    setPrivacyMode(mode);
    try {
      setSaving(true);
      await updateAISettings({ privacyMode: mode });
    } catch (err) {
      console.error('Failed to update privacy mode:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLowCostToggle = async (val: boolean) => {
    setLowCost(val);
    try {
      setSaving(true);
      await updateAISettings({ lowCost: val });
    } catch (err) {
      console.error('Failed to update model tier:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await runAITest({ privacyMode, lowCost });
      setTestResult(res);
      // Reload stats and audit table
      await loadData();
    } catch (err: any) {
      console.error('AI test failed:', err);
      setTestResult({
        error: err.response?.data?.message || err.message || 'AI request failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const modeLabels = {
    public_only: 'Public Data Only',
    redacted: 'Redacted',
    standard: 'Standard',
  };

  const dataSentMatrix = {
    public_only: [
      { sent: true, label: 'Public project name' },
      { sent: true, label: 'Construction dates' },
      { sent: true, label: 'Approximate corridor (grid cell ~250 m)' },
      { sent: true, label: 'Conflict calculations' },
      { sent: false, label: 'Exact geographic coordinates' },
      { sent: false, label: 'Private credentials' },
      { sent: false, label: 'Unnecessary personal information' },
    ],
    redacted: [
      { sent: true, label: 'Redacted project names (e.g. "W████ M███ R████████")' },
      { sent: true, label: 'Construction dates' },
      { sent: true, label: 'Grid-cell sector (~250 m resolution)' },
      { sent: true, label: 'Conflict calculations' },
      { sent: false, label: 'Exact geographic coordinates' },
      { sent: false, label: 'Private credentials' },
      { sent: false, label: 'Unnecessary personal information' },
    ],
    standard: [
      { sent: true, label: 'Public project name' },
      { sent: true, label: 'Construction dates' },
      { sent: true, label: 'Exact geographic coordinates' },
      { sent: true, label: 'Conflict calculations' },
      { sent: false, label: 'Private credentials' },
      { sent: false, label: 'Unnecessary personal information' },
    ],
  }[privacyMode];

  const estCostPerReq = lowCost ? 0.002 : 0.008;

  return (
    <AppShell
      title="AI Control Center"
      subtitle="Control what GridMind sends to AI — always visible, always yours to change."
    >
      <div className="space-y-6">
        {/* Top Header & Mode Banner */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">Active AI Privacy Guard</h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    privacyMode === 'redacted'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : privacyMode === 'public_only'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                  }`}
                >
                  {modeLabels[privacyMode]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Model: <span className="font-medium text-foreground">{lowCost ? 'Gemini 2.5 Flash Lite' : 'Gemini 2.5 Flash'}</span> · 
                Grounded in deterministic evidence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunTest}
              disabled={testing || saving}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {testing ? 'Verifying with Live AI...' : 'Test Privacy Filter'}
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition text-foreground"
              title="Refresh telemetry"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Live Test Result Banner if present */}
        {testResult && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5 transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5 text-primary font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                Live AI Verification Output ({testResult.privacyMode} mode · {testResult.modelUsed})
              </div>
              <button
                onClick={() => setTestResult(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕ Close
              </button>
            </div>
            {testResult.error ? (
              <div className="mt-2 text-xs text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {testResult.error}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="bg-white border border-border rounded-lg p-3 text-xs leading-relaxed text-foreground shadow-xs">
                  <div className="font-semibold text-foreground mb-1">AI Recommendation Summary:</div>
                  {testResult.recommendation?.summary}
                </div>
                <div className="bg-white border border-border rounded-lg p-3 text-xs leading-relaxed text-muted-foreground shadow-xs">
                  <div className="font-semibold text-foreground mb-1">Operational Impact:</div>
                  {testResult.recommendation?.whyItMatters}
                </div>
                {testResult.recommendation?.recommendedActions && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {testResult.recommendation.recommendedActions.map((act: any, idx: number) => (
                      <div key={idx} className="bg-white border border-border rounded p-2.5 shadow-xs">
                        <div className="font-semibold text-foreground flex items-center justify-between">
                          <span>{act.action}</span>
                          <span className="text-[10px] uppercase font-bold text-primary">{act.priority}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{act.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Current Spec & Sent Matrix */}
          <div className="space-y-6">
            {/* Current Request Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-4">
                <Cpu className="w-4 h-4 text-primary" />
                Current Request Specification
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Model Engine</span>
                  <span className="inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {lowCost ? 'Gemini 2.5 Flash Lite' : 'Gemini 2.5 Flash'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Purpose</span>
                  <span className="font-medium text-foreground">Infrastructure Coordination & Recommendation</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Privacy Mode</span>
                  <span className="font-medium text-foreground">{modeLabels[privacyMode]}</span>
                </div>
                {costVisible && (
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Estimated Cost per Request</span>
                    <span className="font-mono font-bold text-sm text-primary">
                      ${estCostPerReq.toFixed(3)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Execution Model</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Vertex AI Grounded
                  </span>
                </div>
              </div>
            </div>

            {/* Data Sent to the Model Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
                <Eye className="w-4 h-4 text-primary" />
                Data Sent to the AI Model
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                GridMind enforces strict field-level redactions before any request reaches the model API.
              </p>
              <div className="space-y-2.5">
                {dataSentMatrix.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 text-xs p-2 rounded-lg border ${
                      item.sent
                        ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        : 'bg-muted/40 border-border/50 text-muted-foreground'
                    }`}
                  >
                    {item.sent ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  The data source behind every AI recommendation stays completely verifiable — inspect Evidence on each conflict.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Privacy Mode & Controls & Usage */}
          <div className="space-y-6">
            {/* Privacy Mode Selector Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
                <Lock className="w-4 h-4 text-primary" />
                Privacy Mode Configuration
              </div>
              <div className="space-y-2.5 mb-5">
                {[
                  {
                    id: 'public_only',
                    title: 'Public Data Only',
                    desc: 'Only published municipal plan data leaves your instance. Coordinates generalized.',
                  },
                  {
                    id: 'redacted',
                    title: 'Redacted',
                    desc: 'Project names, exact corridors, and sensitive scope fields are masked prior to synthesis.',
                  },
                  {
                    id: 'standard',
                    title: 'Standard',
                    desc: 'Full project scope is provided for maximum engineering precision and detail.',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => handlePrivacyChange(opt.id as any)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      privacyMode === opt.id
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacyMode"
                      checked={privacyMode === opt.id}
                      onChange={() => handlePrivacyChange(opt.id as any)}
                      className="mt-1 accent-primary"
                    />
                    <div>
                      <div className="font-semibold text-xs text-foreground">{opt.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="font-semibold text-xs text-foreground mb-3 pt-3 border-t border-border">
                Telemetry & Model Toggles
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-white shadow-xs">
                  <div>
                    <div className="font-medium text-xs text-foreground">Redact Sensitive Fields</div>
                    <div className="text-[11px] text-muted-foreground">Generalize names & coordinates</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyMode === 'redacted'}
                      onChange={(e) => handlePrivacyChange(e.target.checked ? 'redacted' : 'public_only')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-white shadow-xs">
                  <div>
                    <div className="font-medium text-xs text-foreground">Use Lower-Cost Model</div>
                    <div className="text-[11px] text-muted-foreground">Gemini Lite · ~4× cheaper per request</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lowCost}
                      onChange={(e) => handleLowCostToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-white shadow-xs">
                  <div>
                    <div className="font-medium text-xs text-foreground">Show Cost Estimates</div>
                    <div className="text-[11px] text-muted-foreground">Display token costs across UI</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={costVisible}
                      onChange={(e) => {
                        setCostVisible(e.target.checked);
                        updateAISettings({ costVisible: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* AI Usage & Cost Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  AI Usage & Cost Telemetry
                </div>
                {costVisible && (
                  <span className="font-mono font-bold text-sm text-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                    ${stats.totalEstimatedCost.toFixed(4)} total
                  </span>
                )}
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>Input Tokens</span>
                    <span className="font-semibold text-foreground">{stats.totalInputTokens.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(5, (stats.totalInputTokens / 10000) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>Output Tokens</span>
                    <span className="font-semibold text-foreground">{stats.totalOutputTokens.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(5, (stats.totalOutputTokens / 5000) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Total API Requests</span>
                  <span className="font-bold text-sm text-foreground">{stats.totalRequests}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-foreground">AI Request Audit Trail</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete audit history of all Gemini LLM invocations with token and cost metadata
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {requests.length} requests logged
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No AI requests recorded yet. Run an analysis or click "Test Privacy Filter" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border text-[11px] uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Privacy Mode</th>
                    <th className="px-4 py-3">Tokens (In / Out)</th>
                    <th className="px-4 py-3">Est. Cost</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req) => (
                    <tr key={req._id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {req.model}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {req.purpose}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            req.privacyMode === 'redacted'
                              ? 'bg-amber-500/10 text-amber-600'
                              : req.privacyMode === 'public_only'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-blue-500/10 text-blue-600'
                          }`}
                        >
                          {req.privacyMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground whitespace-nowrap">
                        {req.inputTokens} / {req.outputTokens}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-primary">
                        ${req.estimatedCost?.toFixed(4) || '0.0000'}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {req.latencyMs}ms
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
