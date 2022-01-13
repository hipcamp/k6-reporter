export interface k6Point {
  type: string
  data: Data
  metric: string
}

export interface Data {
  time: string
  value: number
  tags: Tags
}

export interface Tags {
  error_code: string
  expected_response: string
  group: string
  method: string
  name: string
  proto: string
  scenario: string
  status: string
  tls_version: string
  url: string
}
