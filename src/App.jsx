import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import {
  Code,
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  BarChart3,
  Settings,
  RefreshCw,
  Send,
  History,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#090d16',
    primaryColor: '#0f172a',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#10b981',
    lineColor: '#10b981',
    secondaryColor: '#059669',
    tertiaryColor: '#090d16'
  }
});

export default function App() {
  // State
  const [problems, setProblems] = useState([]);
  const [selectedProblemId, setSelectedProblemId] = useState('parking-lot');
  const [currentProblem, setCurrentProblem] = useState(null);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [problemAttempts, setProblemAttempts] = useState([]);
  const [activeLeftTab, setActiveLeftTab] = useState('specs'); // 'specs', 'rubric', 'history'
  const [submissionMode, setSubmissionMode] = useState('text'); // 'text' or 'diagram'
  const [activeEditorTab, setActiveEditorTab] = useState('requirementsAndAssumptions');

  // Submission Form State
  const [formData, setFormData] = useState({
    requirementsAndAssumptions: '',
    classDesignAndContracts: '',
    designPatternsAndTradeoffs: '',
    edgeCasesAndConcurrency: '',
    mermaidDefinition: `classDiagram
    class ParkingLot {
        -List~ParkingFloor~ floors
        -ParkingStrategy strategy
        +Ticket parkVehicle(Vehicle v)
        +double exitVehicle(Ticket t)
    }
    class ParkingSpot {
        -String spotId
        -SpotType type
        -boolean isOccupied
        +boolean assignVehicle(Vehicle v)
        +void vacate()
    }
    class ParkingStrategy {
        <<interface>>
        +ParkingSpot findSpot(List~ParkingFloor~ floors, Vehicle v)
    }
    ParkingLot "1" *-- "many" ParkingSpot
    ParkingLot ..> ParkingStrategy : delegates`
  });

  // Evaluation & Pipeline State
  const [evaluationStatus, setEvaluationStatus] = useState('IDLE'); // IDLE, SUBMITTED, EVALUATING, COMPLETED, FAILED
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [evaluatorConfig, setEvaluatorConfig] = useState({
    mode: 'HYBRID',
    hasGeminiApiKey: false,
    apiKeyInput: ''
  });
  const [analyticsData, setAnalyticsData] = useState(null);

  const mermaidRef = useRef(null);

  // 1. Fetch Problems on mount
  useEffect(() => {
    fetch('/api/problems')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProblems(data.problems);
          if (data.problems.length > 0 && !selectedProblemId) {
            setSelectedProblemId(data.problems[0].id);
          }
        }
      })
      .catch(err => console.error('Error fetching problems:', err));

    fetch('/api/evaluator/config')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvaluatorConfig(prev => ({
            ...prev,
            mode: data.mode,
            hasGeminiApiKey: data.hasGeminiApiKey
          }));
        }
      })
      .catch(err => console.error('Error fetching evaluator config:', err));
  }, []);

  // 2. Fetch specific Problem & Attempt when selectedProblemId changes
  useEffect(() => {
    if (!selectedProblemId) return;

    fetch(`/api/problems/${selectedProblemId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentProblem(data.problem);
          // Set starter template as default form data
          if (data.problem.starterTemplate) {
            setFormData(prev => ({
              ...prev,
              requirementsAndAssumptions: data.problem.starterTemplate.requirementsAndAssumptions || '',
              classDesignAndContracts: data.problem.starterTemplate.classDesignAndContracts || '',
              designPatternsAndTradeoffs: data.problem.starterTemplate.designPatternsAndTradeoffs || '',
              edgeCasesAndConcurrency: data.problem.starterTemplate.edgeCasesAndConcurrency || ''
            }));
          }
        }
      })
      .catch(err => console.error('Error fetching problem details:', err));

    // Fetch attempts for this problem
    fetch(`/api/problems/${selectedProblemId}/attempts`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProblemAttempts(data.attempts);
          if (data.attempts.length > 0) {
            // Load latest attempt
            const latest = data.attempts[data.attempts.length - 1];
            loadAttemptDetails(latest.id);
          } else {
            // Start fresh attempt
            startNewAttempt(selectedProblemId);
          }
        }
      })
      .catch(err => console.error('Error fetching attempts:', err));
  }, [selectedProblemId]);

  // Render Mermaid Diagram when switching to diagram mode or modifying definition
  useEffect(() => {
    if (submissionMode === 'diagram' && mermaidRef.current && formData.mermaidDefinition) {
      mermaidRef.current.innerHTML = '';
      const id = `mermaid-svg-${Date.now()}`;
      try {
        mermaid.render(id, formData.mermaidDefinition).then(({ svg }) => {
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
          }
        }).catch(err => {
          console.warn('Mermaid syntax render error:', err);
        });
      } catch (e) {
        console.warn('Mermaid render exception:', e);
      }
    }
  }, [submissionMode, formData.mermaidDefinition]);

  // Start a new attempt
  const startNewAttempt = (problemId = selectedProblemId) => {
    fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentAttempt(data.attempt);
          setCurrentEvaluation(null);
          setEvaluationStatus('IDLE');
          setProblemAttempts(prev => [...prev, data.attempt]);
        }
      })
      .catch(err => console.error('Error starting attempt:', err));
  };

  // Load an existing attempt
  const loadAttemptDetails = (attemptId) => {
    fetch(`/api/attempts/${attemptId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentAttempt(data.attempt);
          if (data.latestEvaluation) {
            setCurrentEvaluation(data.latestEvaluation);
            setEvaluationStatus(data.latestEvaluation.status);
          } else {
            setCurrentEvaluation(null);
            setEvaluationStatus('IDLE');
          }
        }
      })
      .catch(err => console.error('Error loading attempt details:', err));
  };

  // Submit Solution
  const handleSubmit = async () => {
    if (!currentAttempt) {
      startNewAttempt();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setEvaluationStatus('SUBMITTED');

    // Build polymorphic payload (Change Test A)
    let payload;
    if (submissionMode === 'diagram') {
      payload = {
        format: 'DIAGRAM_AST_V1',
        mermaidDefinition: formData.mermaidDefinition,
        notes: formData.designPatternsAndTradeoffs
      };
    } else {
      payload = {
        format: 'STRUCTURED_TEXT_V1',
        requirementsAndAssumptions: formData.requirementsAndAssumptions,
        classDesignAndContracts: formData.classDesignAndContracts,
        designPatternsAndTradeoffs: formData.designPatternsAndTradeoffs,
        edgeCasesAndConcurrency: formData.edgeCasesAndConcurrency
      };
    }

    const idempotencyKey = `sub-${currentAttempt.id}-${Date.now()}`;

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: currentAttempt.id,
          problemId: selectedProblemId,
          payload,
          idempotencyKey
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit solution');
      }

      setEvaluationStatus('EVALUATING');
      pollEvaluation(data.evaluationId);
    } catch (err) {
      setErrorMessage(err.message);
      setEvaluationStatus('FAILED');
      setIsSubmitting(false);
    }
  };

  // Poll Evaluation Status until Completed or Failed
  const pollEvaluation = (evalId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/evaluations/${evalId}`);
        const data = await res.json();
        if (data.success && data.evaluation) {
          setEvaluationStatus(data.evaluation.status);
          if (data.evaluation.status === 'COMPLETED') {
            setCurrentEvaluation(data.evaluation);
            setIsSubmitting(false);
            clearInterval(interval);
            // Refresh attempts list to show updated score
            fetch(`/api/problems/${selectedProblemId}/attempts`)
              .then(r => r.json())
              .then(d => d.success && setProblemAttempts(d.attempts));
          } else if (data.evaluation.status === 'FAILED') {
            setErrorMessage(data.evaluation.error || 'Evaluation failed.');
            setIsSubmitting(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);
  };

  // Open Analytics Modal
  const openAnalytics = () => {
    fetch('/api/analytics/weaknesses')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnalyticsData(data.analytics);
          setShowAnalyticsModal(true);
        }
      });
  };

  // Save Evaluator Settings
  const saveEvaluatorConfig = () => {
    fetch('/api/evaluator/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: evaluatorConfig.mode,
        apiKey: evaluatorConfig.apiKeyInput || undefined
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvaluatorConfig(prev => ({
            ...prev,
            hasGeminiApiKey: data.hasGeminiApiKey
          }));
          setShowConfigModal(false);
        }
      });
  };

  return (
    <div className="app-root">
      {/* 1. Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-logo-icon">
            <Cpu size={22} />
          </div>
          <div>
            <div className="brand-title">LLD Forge</div>
            <div className="brand-tagline">Low-Level Design Practice & Rubric Platform</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-ghost" onClick={openAnalytics}>
            <BarChart3 size={16} />
            Growth Analytics
          </button>
          <button className="btn btn-ghost" onClick={() => setShowConfigModal(true)}>
            <Settings size={16} />
            Evaluator Engine ({evaluatorConfig.mode})
          </button>
          <button className="btn btn-primary" onClick={() => startNewAttempt()}>
            <Sparkles size={16} />
            New Attempt
          </button>
        </div>
      </header>

      {/* 2. Problem Selector Bar */}
      <nav className="problem-selector-bar">
        {problems.map(prob => (
          <button
            key={prob.id}
            className={`problem-nav-pill ${selectedProblemId === prob.id ? 'active' : ''}`}
            onClick={() => setSelectedProblemId(prob.id)}
          >
            <span>{prob.title}</span>
            <span className={`difficulty-badge difficulty-${prob.difficulty}`}>
              {prob.difficulty}
            </span>
          </button>
        ))}
      </nav>

      {/* 3. Main Workspace Split Layout */}
      <main className="workspace-layout">
        {/* Left Panel: Problem Specs, Rubric Guide, Attempt History */}
        <section className="specs-panel">
          <div className="specs-panel-header">
            <h1 className="specs-title">{currentProblem?.title || 'Loading problem...'}</h1>
            <p className="specs-summary">{currentProblem?.summary}</p>
          </div>

          <div className="tab-nav">
            <button
              className={`tab-btn ${activeLeftTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('specs')}
            >
              <BookOpen size={15} />
              Requirements
            </button>
            <button
              className={`tab-btn ${activeLeftTab === 'rubric' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('rubric')}
            >
              <ShieldCheck size={15} />
              Rubric Dimensions
            </button>
            <button
              className={`tab-btn ${activeLeftTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('history')}
            >
              <History size={15} />
              Attempts ({problemAttempts.length})
            </button>
          </div>

          <div className="specs-content">
            {activeLeftTab === 'specs' && currentProblem && (
              <>
                <div className="spec-section">
                  <div className="spec-section-title">Functional Requirements</div>
                  <ul className="spec-list">
                    {currentProblem.functionalRequirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>

                <div className="spec-section">
                  <div className="spec-section-title">Non-Functional & Concurrency</div>
                  <ul className="spec-list">
                    {currentProblem.nonFunctionalRequirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>

                <div className="spec-section">
                  <div className="spec-section-title">Design Constraints</div>
                  <ul className="spec-list">
                    {currentProblem.constraints.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {activeLeftTab === 'rubric' && currentProblem && (
              <div className="rubric-guide-list">
                {currentProblem.rubric.dimensions.map(dim => (
                  <div key={dim.id} className="rubric-guide-card">
                    <div className="rubric-guide-header">
                      <span className="rubric-guide-name">{dim.name}</span>
                      <span className="rubric-weight-badge">{dim.weight}x Weight</span>
                    </div>
                    <div className="rubric-guide-desc">{dim.description}</div>
                    <div className="rubric-expectations">
                      <div className="rubric-good">
                        <strong>✓ Exemplary:</strong> {dim.guidance?.excellent || 'Demonstrates high cohesion and extensibility.'}
                      </div>
                      <div className="rubric-poor">
                        <strong>✗ Anti-pattern:</strong> {dim.guidance?.poor || 'Violates single responsibility or hard-codes dependencies.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeLeftTab === 'history' && (
              <div className="attempt-history-list">
                {problemAttempts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No previous attempts found for this problem.</p>
                ) : (
                  problemAttempts.map(att => (
                    <div
                      key={att.id}
                      className={`rubric-guide-card ${currentAttempt?.id === att.id ? 'active' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => loadAttemptDetails(att.id)}
                    >
                      <div className="rubric-guide-header">
                        <span className="rubric-guide-name">Attempt #{att.attemptNumber}</span>
                        <span className="difficulty-badge difficulty-Medium">{att.status}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Started: {new Date(att.startedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Submission Workbench & Evaluation Dashboard */}
        <section className="workbench-panel">
          {/* Toolbar */}
          <div className="workbench-toolbar">
            <div className="mode-switcher">
              <button
                className={`mode-btn ${submissionMode === 'text' ? 'active' : ''}`}
                onClick={() => setSubmissionMode('text')}
              >
                <Code size={14} />
                Architecture & Code
              </button>
              <button
                className={`mode-btn ${submissionMode === 'diagram' ? 'active' : ''}`}
                onClick={() => setSubmissionMode('diagram')}
              >
                <Layers size={14} />
                UML Class Diagram AST
              </button>
            </div>

            <div className="toolbar-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (currentProblem?.starterTemplate) {
                    setFormData(prev => ({
                      ...prev,
                      requirementsAndAssumptions: currentProblem.starterTemplate.requirementsAndAssumptions || '',
                      classDesignAndContracts: currentProblem.starterTemplate.classDesignAndContracts || '',
                      designPatternsAndTradeoffs: currentProblem.starterTemplate.designPatternsAndTradeoffs || '',
                      edgeCasesAndConcurrency: currentProblem.starterTemplate.edgeCasesAndConcurrency || ''
                    }));
                  }
                }}
              >
                <RefreshCw size={14} />
                Reset Template
              </button>
            </div>
          </div>

          {/* Submission Editor View */}
          {submissionMode === 'text' ? (
            <div className="submission-tabs-container">
              <div className="submission-tab-group">
                <button
                  className={`sub-tab-btn ${activeEditorTab === 'requirementsAndAssumptions' ? 'active' : ''}`}
                  onClick={() => setActiveEditorTab('requirementsAndAssumptions')}
                >
                  1. Requirements & Assumptions
                </button>
                <button
                  className={`sub-tab-btn ${activeEditorTab === 'classDesignAndContracts' ? 'active' : ''}`}
                  onClick={() => setActiveEditorTab('classDesignAndContracts')}
                >
                  2. Classes & Interfaces (Code)
                </button>
                <button
                  className={`sub-tab-btn ${activeEditorTab === 'designPatternsAndTradeoffs' ? 'active' : ''}`}
                  onClick={() => setActiveEditorTab('designPatternsAndTradeoffs')}
                >
                  3. Patterns & Trade-offs
                </button>
                <button
                  className={`sub-tab-btn ${activeEditorTab === 'edgeCasesAndConcurrency' ? 'active' : ''}`}
                  onClick={() => setActiveEditorTab('edgeCasesAndConcurrency')}
                >
                  4. Edge Cases & Concurrency
                </button>
              </div>

              <div className="editor-field-wrapper">
                <div className="editor-field-header">
                  <span className="editor-field-label">
                    {activeEditorTab === 'requirementsAndAssumptions' && 'Scope, Assumptions & Capacity Bounds'}
                    {activeEditorTab === 'classDesignAndContracts' && 'Class Signatures, Methods, Interfaces & State Fields'}
                    {activeEditorTab === 'designPatternsAndTradeoffs' && 'Architectural Patterns Applied (Strategy, Factory, State) & Rationale'}
                    {activeEditorTab === 'edgeCasesAndConcurrency' && 'Thread-Safety Guarantees, Race Conditions & Failure Handling'}
                  </span>
                  <span className="editor-field-hint">Markdown / Java / C++ / TypeScript</span>
                </div>

                <textarea
                  className="code-textarea"
                  value={formData[activeEditorTab]}
                  onChange={e => setFormData({ ...formData, [activeEditorTab]: e.target.value })}
                  placeholder="Write your low-level design specification here..."
                  spellCheck="false"
                />
              </div>
            </div>
          ) : (
            /* Diagram AST Mode (Change Test A) */
            <div className="submission-tabs-container">
              <div className="editor-field-header">
                <span className="editor-field-label">Mermaid Class Diagram Definition (Change Test A AST)</span>
                <span className="editor-field-hint">Live Rendered Graph</span>
              </div>
              <textarea
                className="code-textarea"
                style={{ height: '180px' }}
                value={formData.mermaidDefinition}
                onChange={e => setFormData({ ...formData, mermaidDefinition: e.target.value })}
                placeholder="classDiagram ..."
              />
              <div className="mermaid-diagram-container" ref={mermaidRef}>
                Diagram rendering...
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="workbench-footer">
            <div className="status-indicator-badge">
              <span className={`status-dot ${evaluationStatus}`}></span>
              <span>
                Attempt #{currentAttempt?.attemptNumber || 1} • State: <strong>{evaluationStatus}</strong>
              </span>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Evaluating Rubric...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit for Rubric Evaluation
                </>
              )}
            </button>
          </div>

          {/* Evaluation Results Dashboard */}
          {currentEvaluation && currentEvaluation.status === 'COMPLETED' && (
            <div className="evaluation-dashboard">
              {/* Hero Banner */}
              <div className="evaluation-hero-card">
                <div className="score-radial-group">
                  <div className={`score-circle ${currentEvaluation.overallScore >= 85 ? 'high' : currentEvaluation.overallScore >= 70 ? 'medium' : 'low'}`}>
                    <span className="score-val">{currentEvaluation.overallScore}</span>
                    <span className="score-max">/ 100</span>
                  </div>
                </div>

                <div className="eval-summary-group">
                  <div className="eval-summary-title">Rubric Evaluation Complete</div>
                  <div className="eval-summary-text">{currentEvaluation.summary}</div>
                  <div className="eval-engine-badge">
                    <ShieldCheck size={14} />
                    Engine: {currentEvaluation.evaluatorEngine}
                  </div>
                </div>
              </div>

              {/* Rubric Dimensions Grid */}
              <div className="rubric-results-grid">
                {currentEvaluation.rubricResults.map(result => (
                  <div key={result.criterionId} className="rubric-result-card">
                    <div className="rubric-card-header">
                      <span className="rubric-card-title">{result.criterionName}</span>
                      <span
                        className="rubric-card-score"
                        style={{
                          color: result.score >= 85 ? '#34d399' : result.score >= 70 ? '#fbbf24' : '#f87171'
                        }}
                      >
                        {result.score}%
                      </span>
                    </div>

                    <div className="rubric-progress-track">
                      <div
                        className="rubric-progress-fill"
                        style={{
                          width: `${result.score}%`,
                          background: result.score >= 85 ? '#10b981' : result.score >= 70 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>

                    <div className="feedback-tuple-block">
                      {/* Evidence */}
                      <div className="feedback-row evidence">
                        <span className="feedback-label evidence">
                          <CheckCircle2 size={12} />
                          Quoted Evidence
                        </span>
                        <div className="feedback-body">{result.evidence}</div>
                      </div>

                      {/* Concern */}
                      <div className="feedback-row concern">
                        <span className="feedback-label concern">
                          <AlertTriangle size={12} />
                          Architectural Concern
                        </span>
                        <div className="feedback-body">{result.concern}</div>
                      </div>

                      {/* Suggestion */}
                      <div className="feedback-row suggestion">
                        <span className="feedback-label suggestion">
                          <Lightbulb size={12} />
                          Actionable Suggestion
                        </span>
                        <div className="feedback-body">{result.suggestion}</div>
                      </div>

                      <div className="feedback-confidence">
                        Confidence: {Math.round(result.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 4. Evaluator Configuration Modal (Change Test B) */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Evaluator Engine Settings (Change Test B)</span>
              <button className="btn btn-ghost" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Demonstrates <strong>Change Test B</strong>: Pluggable evaluation strategies without altering the practice loop.
              </p>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-accent)' }}>
                  Active Evaluator Pipeline Mode
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {['HYBRID', 'DETERMINISTIC_ONLY', 'AI_ONLY'].map(m => (
                    <button
                      key={m}
                      className={`btn ${evaluatorConfig.mode === m ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setEvaluatorConfig({ ...evaluatorConfig, mode: m })}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-accent)' }}>
                  Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={evaluatorConfig.apiKeyInput}
                  onChange={e => setEvaluatorConfig({ ...evaluatorConfig, apiKeyInput: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#090d16',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    marginTop: '0.4rem'
                  }}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                  {evaluatorConfig.hasGeminiApiKey
                    ? '✓ Live Gemini AI is active and configured.'
                    : 'ℹ️ No API key set. The platform runs the built-in Intelligent Semantic Simulation Engine with deterministic rule anchoring.'}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEvaluatorConfig}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Longitudinal Weakness Analytics Modal */}
      {showAnalyticsModal && analyticsData && (
        <div className="modal-overlay" onClick={() => setShowAnalyticsModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Longitudinal Learner Analytics & Weaknesses</span>
              <button className="btn btn-ghost" onClick={() => setShowAnalyticsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Attempts</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analyticsData.totalAttempts}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Evaluated Submissions</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    {analyticsData.evaluatedAttempts}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-accent)' }}>
                  Identified Recurring Weaknesses (Sorted by Average Score)
                </h4>
                {analyticsData.weaknesses.map(w => (
                  <div
                    key={w.criterionId}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.8rem',
                      marginBottom: '0.6rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{w.criterionName}</span>
                      <span style={{ color: w.averageScore >= 80 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                        Avg: {w.averageScore}%
                      </span>
                    </div>
                    {w.recurringConcerns.length > 0 && (
                      <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
                        Recurring concern: {w.recurringConcerns[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowAnalyticsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
