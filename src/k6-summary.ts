export interface k6Summary {
  metrics: Metrics
}

export interface Metrics {
  http_req_connecting: Trend
  http_req_tls_handshaking: Trend
  http_req_duration: Trend
  iteration_duration: Trend
  http_req_blocked: Trend
  http_reqs: Counter
  http_status_200: Counter
  http_status_429: Counter
  vus: Gauge
  http_req_receiving: Trend
  http_req_waiting: Trend
  iterations: Counter
  http_req_sending: Trend
  http_req_failed: HttpReqFailed
  http_status_401: Counter
  http_status_404: Counter
  http_status_302: Counter
  vus_max: Gauge
  data_sent: Counter
  data_received: Counter
}

export interface Trend {
  max: number
  p90: number
  p95: number
  avg: number
  min: number
  med: number
}

export interface Counter {
  count: number
  rate: number
}

export interface Gauge {
  value: number
  min: number
  max: number
}

export interface HttpReqFailed {
  fails: number
  passes: number
  value: number
}
