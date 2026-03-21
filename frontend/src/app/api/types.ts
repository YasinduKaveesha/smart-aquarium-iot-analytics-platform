// API response types — mirror backend Pydantic models exactly

export interface LatestResponse {
  timestamp: string
  ph: number | null
  temperature: number | null
  tds: number | null
  turbidity: number | null
  wqi_score: number | null
  anomaly_flag: number
  mode: string
  breakdown: Record<string, number>
  sensor_errors?: string[]
}

export interface StatusResponse {
  mode: string
  days_until_adaptive: number
  install_date: string
  maintenance_active: boolean
  stabilizing_until: string | null
  latest_wqi: number | null
  latest_anomaly_flag: number
}

export interface ApiForecastPoint {
  timestamp: string
  mean: number
  lower: number
  upper: number
}

export interface ForecastResponse {
  ph_forecast: ApiForecastPoint[]
  temp_forecast: ApiForecastPoint[]
}

export interface HistoryRecord {
  timestamp: string
  ph: number | null
  temperature: number | null
  tds: number | null
  turbidity: number | null
  wqi_score: number | null
  anomaly_flag: number | null
  mode: string | null
}

export interface AnomalyEventApi {
  timestamp: string
  ph: number | null
  temperature: number | null
  tds: number | null
  turbidity: number | null
  wqi_score: number | null
  anomaly_flag: number
  persistence: number
  mode: string | null
}

export interface MaintenanceResponse {
  status: string
  stabilizing_until: string | null
  validation: { is_valid: boolean; errors: string[] }
}

// Adapted shape — matches mock SensorReading so pages need minimal changes
export interface SensorReading {
  timestamp: string
  temperature: number
  pH: number       // adapted from backend 'ph'
  tds: number
  turbidity: number
  wqi: number      // adapted from backend 'wqi_score'
}

// Adapted forecast point — matches mock ForecastPoint
export interface ForecastPoint {
  time: string     // adapted from backend 'timestamp'
  mean: number
  lower: number
  upper: number
}
