import { useEffect, useMemo, useState } from 'react'
import './App.css'

// 백엔드 주소는 .env의 VITE_API_BASE_URL을 우선 사용하고, 없으면 로컬 FastAPI 기본 주소 사용
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

// 모델이 요구하는 feature 키와 화면에 보여줄 라벨을 한 곳에서 관리
const featureDefinitions = [
  ['destination_port', 'Destination port'],
  ['protocol', 'Protocol'],
  ['flow_duration', 'Flow duration'],
  ['total_fwd_packets', 'Total fwd packets'],
  ['total_backward_packets', 'Total backward packets'],
  ['total_length_fwd_packets', 'Total length fwd packets'],
  ['total_length_bwd_packets', 'Total length bwd packets'],
  ['flow_bytes_per_s', 'Flow bytes/s'],
  ['flow_packets_per_s', 'Flow packets/s'],
  ['fwd_packets_per_s', 'Fwd packets/s'],
  ['bwd_packets_per_s', 'Bwd packets/s'],
  ['min_packet_length', 'Min packet length'],
  ['max_packet_length', 'Max packet length'],
  ['packet_length_mean', 'Packet length mean'],
  ['packet_length_std', 'Packet length std'],
  ['syn_flag_count', 'SYN flag count'],
  ['rst_flag_count', 'RST flag count'],
  ['ack_flag_count', 'ACK flag count'],
  ['average_packet_size', 'Average packet size'],
  ['down_up_ratio', 'Down/up ratio'],
] as const

// featureDefinitions에서 feature 이름 타입을 자동으로 만들고, 모든 feature 값을 number로 제한
type FeatureName = (typeof featureDefinitions)[number][0]
type FeatureValues = Record<FeatureName, number>

// 백엔드 API의 요청/응답 구조를 프론트엔드에서 타입으로 맞춰 관리
type HealthResponse = {
  status: string
  model_path: string
  required_feature_count: number
  windows_firewall_enabled: boolean
}

type PredictionRequest = {
  source_ip?: string
  destination_ip?: string
  flow_id?: string
  features: FeatureValues
}

type PredictionResponse = {
  prediction: number
  attack_probability: number
  risk_score: number
  risk_level: string
  action_taken: string
  should_block: boolean
  reason: string
  source_ip?: string | null
  destination_ip?: string | null
  flow_id?: string | null
}

type BlockedSource = {
  source_ip: string
  expires_at_utc: string
}

type BlockedSourceListResponse = {
  blocked_sources: BlockedSource[]
}

type FlowAnalysisSummary = {
  total_flows: number
  attack_flows: number
  benign_flows: number
  blocked_sources: BlockedSource[]
  log_csv_path: string
  log_json_path: string
}

type FlowAnalysisResponse = {
  summary: FlowAnalysisSummary
  results: Record<string, unknown>[]
}

type OperationState = {
  loading: boolean
  error: string | null
  message: string | null
}

type ConnectionState = 'checking' | 'online' | 'offline'

// 예측 테스트 폼을 처음 열었을 때 채워지는 샘플 feature 값
const defaultFeatures: FeatureValues = {
  destination_port: 80,
  protocol: 6,
  flow_duration: 1200,
  total_fwd_packets: 50,
  total_backward_packets: 3,
  total_length_fwd_packets: 4000,
  total_length_bwd_packets: 180,
  flow_bytes_per_s: 3500,
  flow_packets_per_s: 44,
  fwd_packets_per_s: 41,
  bwd_packets_per_s: 3,
  min_packet_length: 60,
  max_packet_length: 1500,
  packet_length_mean: 78,
  packet_length_std: 33,
  syn_flag_count: 45,
  rst_flag_count: 0,
  ack_flag_count: 2,
  average_packet_size: 76,
  down_up_ratio: 0.06,
}

// 요청 버튼 주변에서 공통으로 사용하는 loading/error/success 상태
const initialOperationState: OperationState = {
  loading: false,
  error: null,
  message: null,
}

// 차단 목록은 첫 화면에서 바로 불러오므로 초기 loading 값을 true로 둠
const initialBlockedState: OperationState = {
  loading: true,
  error: null,
  message: null,
}

// catch로 받은 unknown 값을 화면에 표시할 수 있는 문자열로 변환
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
}

// 모든 백엔드 요청에서 공통으로 사용하는 JSON fetch helper
async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const payload = (await response.json()) as { detail?: unknown }
      if (typeof payload.detail === 'string') {
        detail = payload.detail
      } else if (payload.detail) {
        detail = JSON.stringify(payload.detail)
      }
    } catch {
    }
    throw new Error(`${response.status} ${detail}`)
  }

  return (await response.json()) as T
}

// 0~1 범위의 확률 값을 사람이 읽기 쉬운 퍼센트 문자열로 변환
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

// 분석 결과 테이블에 표시할 수 있도록 unknown 값을 안정적인 문자열로 변환
function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(4)
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (value === null || value === undefined) {
    return '-'
  }
  return String(value)
}

// 백엔드가 내려준 risk_level 값을 CSS 클래스 이름으로 안전하게 매핑
function getRiskClass(riskLevel: string | undefined): string {
  if (!riskLevel) {
    return 'neutral'
  }
  return ['low', 'medium', 'high', 'critical'].includes(riskLevel) ? riskLevel : 'neutral'
}

function App() {
  // 백엔드 연결 상태와 /health 응답 관리
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  // /predict 요청에 사용할 입력값, 결과, 요청 상태 관리
  const [sourceIp, setSourceIp] = useState('192.168.0.10')
  const [destinationIp, setDestinationIp] = useState('')
  const [flowId, setFlowId] = useState('demo-flow-001')
  const [features, setFeatures] = useState<FeatureValues>(defaultFeatures)
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null)
  const [predictionState, setPredictionState] = useState<OperationState>(initialOperationState)

  // /analyze/pcap 요청에 사용할 PCAP 경로, 옵션, 결과 상태
  const [pcapPath, setPcapPath] = useState('C:\\path\\to\\sample.pcap')
  const [pcapApplyDefense, setPcapApplyDefense] = useState(false)
  const [pcapPacketLimit, setPcapPacketLimit] = useState('50000')
  const [pcapResult, setPcapResult] = useState<FlowAnalysisResponse | null>(null)
  const [pcapState, setPcapState] = useState<OperationState>(initialOperationState)

  // /analyze/live 요청에 사용할 인터페이스, 캡처 시간, 옵션, 결과 상태
  const [liveInterface, setLiveInterface] = useState('Ethernet')
  const [liveDuration, setLiveDuration] = useState(10)
  const [livePacketLimit, setLivePacketLimit] = useState('')
  const [liveApplyDefense, setLiveApplyDefense] = useState(false)
  const [liveResult, setLiveResult] = useState<FlowAnalysisResponse | null>(null)
  const [liveState, setLiveState] = useState<OperationState>(initialOperationState)

  // 현재 차단된 source IP 목록과 목록 갱신/해제 요청 상태입
  const [blockedSources, setBlockedSources] = useState<BlockedSource[]>([])
  const [blockedState, setBlockedState] = useState<OperationState>(initialBlockedState)

  // PCAP 분석과 실시간 분석 중 가장 최근 결과를 요약 카드에 표시
  const latestAnalysis = liveResult ?? pcapResult
  const recentRisk = predictionResult?.risk_level ?? latestAnalysis?.results[0]?.risk_level?.toString() ?? 'none'

  // 분석 결과가 없을 때와 있을 때의 요약 문구를 분리해 렌더링을 단순하게 유지
  const lastAnalysisLabel = useMemo(() => {
    if (!latestAnalysis) {
      return '아직 실행 전'
    }
    return `${latestAnalysis.summary.total_flows} flows · attack ${latestAnalysis.summary.attack_flows}`
  }, [latestAnalysis])

  // /health를 호출해 백엔드 연결 여부, 모델 feature 개수, 방화벽 설정 확인
  const checkHealth = async () => {
    try {
      const result = await requestJson<HealthResponse>('/health')
      setHealth(result)
      setHealthError(null)
      setConnectionState('online')
    } catch (error) {
      setHealth(null)
      setHealthError(getErrorMessage(error))
      setConnectionState('offline')
    }
  }

  // 차단 목록을 다시 불러와 대시보드의 차단 IP 수와 목록 동기화
  const loadBlockedSources = async () => {
    try {
      const result = await requestJson<BlockedSourceListResponse>('/blocked-sources')
      setBlockedSources(result.blocked_sources)
      setBlockedState({ loading: false, error: null, message: '차단 목록을 갱신했습니다.' })
    } catch (error) {
      setBlockedState({ loading: false, error: getErrorMessage(error), message: null })
    }
  }

  // 첫 렌더링 직후 서버 상태와 차단 목록을 자동으로 조회
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void checkHealth()
      void loadBlockedSources()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [])

  // number input의 문자열 값을 모델 payload에 맞게 number로 변환해 저장
  const updateFeature = (name: FeatureName, value: string) => {
    setFeatures((current) => ({
      ...current,
      [name]: Number(value),
    }))
  }

  // 예측 테스트 feature 값을 샘플 기본값으로 되돌림
  const resetFeatures = () => {
    setFeatures(defaultFeatures)
  }

  // 예측 폼 제출 시 /predict에 feature payload를 보내고 결과를 화면에 반영
  const submitPrediction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPredictionState({ loading: true, error: null, message: null })
    const payload: PredictionRequest = {
      source_ip: sourceIp.trim() || undefined,
      destination_ip: destinationIp.trim() || undefined,
      flow_id: flowId.trim() || undefined,
      features,
    }

    try {
      const result = await requestJson<PredictionResponse>('/predict', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setPredictionResult(result)
      setPredictionState({ loading: false, error: null, message: '예측 요청이 완료되었습니다.' })
      void loadBlockedSources()
    } catch (error) {
      setPredictionState({ loading: false, error: getErrorMessage(error), message: null })
    }
  }

  // PCAP 분석 폼 제출 시 서버 로컬 경로의 PCAP 파일을 백엔드에서 분석하도록 요청
  const submitPcapAnalysis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPcapState({ loading: true, error: null, message: null })
    try {
      const result = await requestJson<FlowAnalysisResponse>('/analyze/pcap', {
        method: 'POST',
        body: JSON.stringify({
          pcap_path: pcapPath,
          apply_defense: pcapApplyDefense,
          packet_limit: pcapPacketLimit ? Number(pcapPacketLimit) : null,
        }),
      })
      setPcapResult(result)
      setPcapState({ loading: false, error: null, message: 'PCAP 분석이 완료되었습니다.' })
      setBlockedSources(result.summary.blocked_sources)
    } catch (error) {
      setPcapState({ loading: false, error: getErrorMessage(error), message: null })
    }
  }

  // 실시간 분석 폼 제출 시 지정한 네트워크 인터페이스를 백엔드가 캡처하도록 요청
  const submitLiveAnalysis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLiveState({ loading: true, error: null, message: null })
    try {
      const result = await requestJson<FlowAnalysisResponse>('/analyze/live', {
        method: 'POST',
        body: JSON.stringify({
          interface: liveInterface,
          duration_seconds: liveDuration,
          packet_limit: livePacketLimit ? Number(livePacketLimit) : null,
          apply_defense: liveApplyDefense,
        }),
      })
      setLiveResult(result)
      setLiveState({ loading: false, error: null, message: '실시간 분석이 완료되었습니다.' })
      setBlockedSources(result.summary.blocked_sources)
    } catch (error) {
      setLiveState({ loading: false, error: getErrorMessage(error), message: null })
    }
  }

  // 차단 목록의 특정 source IP를 해제하고, 완료 후 목록을 다시 조회
  const unblockSource = async (sourceIpToUnblock: string) => {
    setBlockedState({ loading: true, error: null, message: null })
    try {
      await requestJson<{ source_ip: string; removed: boolean }>(`/blocked-sources/${encodeURIComponent(sourceIpToUnblock)}`, {
        method: 'DELETE',
      })
      setBlockedState({ loading: false, error: null, message: `${sourceIpToUnblock} 차단을 해제했습니다.` })
      void loadBlockedSources()
    } catch (error) {
      setBlockedState({ loading: false, error: getErrorMessage(error), message: null })
    }
  }

  return (
    <main className="dashboard-shell">
      {/* 상단 영역: 서비스 제목과 백엔드 연결 상태 표시 */}
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">AI DDoS Defense Monitor</p>
          <h1>AI 기반 DDoS 탐지/방어 대시보드</h1>
          <p className="subtitle">FastAPI 예측, 패킷 분석, 차단 목록을 한 화면에서 확인합니다.</p>
        </div>
        <div className={`status-panel ${connectionState}`}>
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>{connectionState === 'online' ? 'Backend Online' : connectionState === 'checking' ? 'Checking...' : 'Backend Offline'}</strong>
            <span>{API_BASE_URL}</span>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setConnectionState('checking')
              void checkHealth()
            }}
          >
            재확인
          </button>
        </div>
      </header>

      {/* 백엔드 연결에 실패했을 때만 오류 배너를 노출 */}
      {healthError && <div className="alert error">백엔드 연결 실패: {healthError}</div>}

      {/* 요약 카드: 서버 상태, 최근 위험도, 차단 IP 수, 마지막 분석 결과를 보여줌 */}
      <section className="summary-grid" aria-label="요약 카드">
        <article className="summary-card">
          <span>서버 상태</span>
          <strong>{health?.status ?? connectionState}</strong>
          <small>Model features: {health?.required_feature_count ?? '-'}</small>
        </article>
        <article className={`summary-card risk-${getRiskClass(recentRisk)}`}>
          <span>최근 위험도</span>
          <strong>{recentRisk}</strong>
          <small>{predictionResult ? `score ${predictionResult.risk_score}` : '최근 예측/분석 기준'}</small>
        </article>
        <article className="summary-card">
          <span>차단 IP 수</span>
          <strong>{blockedSources.length}</strong>
          <small>Windows Firewall: {health?.windows_firewall_enabled ? 'enabled' : 'disabled'}</small>
        </article>
        <article className="summary-card">
          <span>마지막 분석 결과</span>
          <strong>{lastAnalysisLabel}</strong>
          <small>{latestAnalysis?.summary.log_json_path ?? '분석 로그 없음'}</small>
        </article>
      </section>

      {/* 예측 테스트: 수동으로 feature를 입력해 /predict API 동작을 확인 */}
      <section className="panel prediction-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Prediction API</p>
            <h2>예측 테스트</h2>
          </div>
          <button type="button" className="secondary-button" onClick={resetFeatures}>
            README 기본값 복원
          </button>
        </div>
        <form onSubmit={submitPrediction}>
          <div className="form-grid compact">
            <label>
              Source IP
              <input value={sourceIp} onChange={(event) => setSourceIp(event.target.value)} placeholder="192.168.0.10" />
            </label>
            <label>
              Destination IP
              <input value={destinationIp} onChange={(event) => setDestinationIp(event.target.value)} placeholder="선택 입력" />
            </label>
            <label>
              Flow ID
              <input value={flowId} onChange={(event) => setFlowId(event.target.value)} placeholder="선택 입력" />
            </label>
          </div>
          <div className="feature-grid">
            {featureDefinitions.map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  type="number"
                  step="any"
                  value={features[name]}
                  onChange={(event) => updateFeature(name, event.target.value)}
                />
              </label>
            ))}
          </div>
          <ActionRow state={predictionState} submitLabel="POST /predict" />
        </form>
        {predictionResult && (
          <div className="result-card">
            <div className="result-main">
              <span className={`risk-badge ${getRiskClass(predictionResult.risk_level)}`}>{predictionResult.risk_level}</span>
              <strong>{predictionResult.prediction === 1 ? 'Attack predicted' : 'Benign predicted'}</strong>
              <small>Attack probability {formatPercent(predictionResult.attack_probability)}</small>
            </div>
            <dl className="metrics-list">
              <div><dt>risk_score</dt><dd>{predictionResult.risk_score}</dd></div>
              <div><dt>action_taken</dt><dd>{predictionResult.action_taken}</dd></div>
              <div><dt>should_block</dt><dd>{predictionResult.should_block ? 'true' : 'false'}</dd></div>
              <div><dt>reason</dt><dd>{predictionResult.reason}</dd></div>
            </dl>
          </div>
        )}
      </section>

      {/* 분석 영역: PCAP 파일 분석과 실시간 인터페이스 분석을 나란히 제공 */}
      <div className="two-column">
        <AnalysisPanel
          title="PCAP 분석"
          eyebrow="PCAP Analysis API"
          state={pcapState}
          result={pcapResult}
          onSubmit={submitPcapAnalysis}
        >
          <label>
            pcap_path
            <input value={pcapPath} onChange={(event) => setPcapPath(event.target.value)} />
          </label>
          <label>
            packet_limit
            <input type="number" min="1" value={pcapPacketLimit} onChange={(event) => setPcapPacketLimit(event.target.value)} />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={pcapApplyDefense} onChange={(event) => setPcapApplyDefense(event.target.checked)} />
            apply_defense
          </label>
        </AnalysisPanel>

        <AnalysisPanel
          title="실시간 분석"
          eyebrow="Live Analysis API"
          state={liveState}
          result={liveResult}
          onSubmit={submitLiveAnalysis}
        >
          <label>
            interface
            <input value={liveInterface} onChange={(event) => setLiveInterface(event.target.value)} />
          </label>
          <label>
            duration_seconds
            <input type="number" min="1" max="300" value={liveDuration} onChange={(event) => setLiveDuration(Number(event.target.value))} />
          </label>
          <label>
            packet_limit
            <input type="number" min="1" value={livePacketLimit} onChange={(event) => setLivePacketLimit(event.target.value)} placeholder="선택 입력" />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={liveApplyDefense} onChange={(event) => setLiveApplyDefense(event.target.checked)} />
            apply_defense
          </label>
        </AnalysisPanel>
      </div>

      {/* 방어 API 영역: 현재 차단 목록을 확인하고 개별 IP 차단 해제 */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Defense API</p>
            <h2>차단 목록</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setBlockedState({ loading: true, error: null, message: null })
              void loadBlockedSources()
            }}
            disabled={blockedState.loading}
          >
            목록 새로고침
          </button>
        </div>
        <StatusMessage state={blockedState} />
        {blockedSources.length === 0 ? (
          <div className="empty-state">현재 메모리에 차단된 source IP가 없습니다.</div>
        ) : (
          <div className="blocked-list">
            {blockedSources.map((source) => (
              <div className="blocked-item" key={source.source_ip}>
                <div>
                  <strong>{source.source_ip}</strong>
                  <span>expires_at_utc: {source.expires_at_utc}</span>
                </div>
                <button type="button" className="danger-button" onClick={() => void unblockSource(source.source_ip)} disabled={blockedState.loading}>
                  해제
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

// 요청 실행 버튼과 성공/오류 메시지를 공통 형태로 출력
function ActionRow({ state, submitLabel }: { state: OperationState; submitLabel: string }) {
  return (
    <div className="action-row">
      <button type="submit" disabled={state.loading}>
        {state.loading ? '요청 중...' : submitLabel}
      </button>
      <StatusMessage state={state} />
    </div>
  )
}

// OperationState에 error가 있으면 오류, message가 있으면 성공 메시지 표시
function StatusMessage({ state }: { state: OperationState }) {
  if (state.error) {
    return <span className="inline-status error">{state.error}</span>
  }
  if (state.message) {
    return <span className="inline-status success">{state.message}</span>
  }
  return null
}

// PCAP 분석과 실시간 분석이 같은 레이아웃을 공유하도록 만든 재사용 패널
function AnalysisPanel({
  title,
  eyebrow,
  state,
  result,
  onSubmit,
  children,
}: {
  title: string
  eyebrow: string
  state: OperationState
  result: FlowAnalysisResponse | null
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  children: React.ReactNode
}) {
  return (
    <section className="panel analysis-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-grid">{children}</div>
        <ActionRow state={state} submitLabel={title === 'PCAP 분석' ? 'POST /analyze/pcap' : 'POST /analyze/live'} />
      </form>
      {result && <AnalysisResult result={result} />}
    </section>
  )
}

// 분석 응답의 summary와 results 일부를 대시보드에서 빠르게 확인할 수 있게 렌더링
function AnalysisResult({ result }: { result: FlowAnalysisResponse }) {
  const previewRows = result.results.slice(0, 5)
  return (
    <div className="analysis-result">
      <div className="mini-summary">
        <span>Total <strong>{result.summary.total_flows}</strong></span>
        <span>Attack <strong>{result.summary.attack_flows}</strong></span>
        <span>Benign <strong>{result.summary.benign_flows}</strong></span>
      </div>
      <dl className="log-list">
        <div><dt>CSV log</dt><dd>{result.summary.log_csv_path}</dd></div>
        <div><dt>JSON log</dt><dd>{result.summary.log_json_path}</dd></div>
      </dl>
      {previewRows.length > 0 ? (
        <div className="json-preview">
          {previewRows.map((row, index) => (
            <div className="flow-row" key={`${formatValue(row.flow_id)}-${index}`}>
              <div className="flow-row-heading">
                <strong>{formatValue(row.flow_id) || `flow-${index + 1}`}</strong>
                <span className={`risk-badge ${getRiskClass(row.risk_level?.toString())}`}>{formatValue(row.risk_level)}</span>
              </div>
              <div className="flow-row-grid">
                <span>src: {formatValue(row.source_ip)}</span>
                <span>dst: {formatValue(row.destination_ip)}</span>
                <span>prediction: {formatValue(row.prediction)}</span>
                <span>prob: {typeof row.attack_probability === 'number' ? formatPercent(row.attack_probability) : '-'}</span>
                <span>action: {formatValue(row.action_taken)}</span>
                <span>block: {formatValue(row.should_block)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">분석된 flow가 없습니다.</div>
      )}
    </div>
  )
}

export default App
