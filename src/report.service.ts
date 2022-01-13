/* eslint-disable filenames/match-regex */
import {Counter, Trend, k6Summary} from './k6-summary'
import {context, getOctokit} from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'
import prettyBytes from 'pretty-bytes'
import prettyMs from 'pretty-ms'

export class ReportService {
  private readonly client: InstanceType<typeof GitHub>
  private readonly baseUrl: string

  constructor(token: string, baseUrl: string) {
    this.client = getOctokit(token)
    this.baseUrl = baseUrl
  }

  async create(summary: k6Summary): Promise<string> {
    return (
      await this.client.rest.checks.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: `Load Test Report (${new Date().toISOString()})`,
        head_sha: context.sha,
        conclusion: 'success',
        output: {
          title: this.baseUrl,
          summary: this.generateSummary(summary),
          text: this.generateReport(summary)
        }
      })
    ).data.html_url as string
  }

  private round(input: number, decimalPlaces = 2): number {
    const magicNumber: number = +`1${'0'.repeat(decimalPlaces)}`
    return Math.round(input * magicNumber) / magicNumber
  }

  private generateSummary(summary: k6Summary): string {
    return `
Active Virtual Users Simulated: ${summary.metrics.vus.value}
Iterations (aggregate number of times the script was executed): ${
      summary.metrics.iterations.count
    }
Data Sent: ${prettyBytes(summary.metrics.data_sent.count)} (${prettyBytes(
      summary.metrics.data_sent.rate
    )}/s)
Data Received: ${prettyBytes(
      summary.metrics.data_received.count
    )} (${prettyBytes(summary.metrics.data_received.rate)}/s)
        `
  }

  private generateReport(summary: k6Summary): string {
    return `
| Metric | Value |
| --- | --- |
| Total HTTP Requests  | ${summary.metrics.http_reqs.count} (${this.round(
      summary.metrics.http_reqs.rate
    )} request/s) |
| Passing Request Rate | ${this.round(
      summary.metrics.http_req_failed.value * 100
    )}% (${summary.metrics.http_req_failed.fails} failed requests) |
${this.generateHttpStatusRows(summary)}

## HTTP Connection Metrics
| Metric | Average | Minimum | Median | Maximum | 90th Percentile | 95th Percentile |
| ------ | ------- | ------- | ------ | ------- | --------------- | --------------- |
${this.generateTrendRow(
  'Time Spent Blocked (waiting for TCP connection slot)',
  summary.metrics.http_req_blocked
)}
${this.generateTrendRow(
  'Time Spent Connecting (establishing TCP connection to host)',
  summary.metrics.http_req_connecting
)}
${this.generateTrendRow(
  'TLS Handshake',
  summary.metrics.http_req_tls_handshaking
)}
${this.generateTrendRow(
  'Request Duration (sending + waiting + receiving)',
  summary.metrics.http_req_duration
)}
${this.generateTrendRow(
  'Sending (time spent sending data to remote host)',
  summary.metrics.http_req_sending
)}
${this.generateTrendRow(
  'Waiting (time spent waiting for response from remote host)',
  summary.metrics.http_req_waiting
)}
${this.generateTrendRow(
  'Receiving (time spent receiving response data from remote host)',
  summary.metrics.http_req_receiving
)}
        `
  }

  private generateHttpStatusRows(summary: k6Summary): string {
    const keys: string[] = Object.keys(summary.metrics).filter(x =>
      x.startsWith('http_status_')
    )
    const sortedKeys: string[] = keys.sort((a: string, b: string) => {
      const key_a: number = +a.replace('http_status_', '')
      const key_b: number = +b.replace('http_status_', '')

      return key_a < key_b ? -1 : 1
    })

    return sortedKeys
      .map((x: string) => {
        return this.generateHttpStatusRow(
          x,
          Object(summary.metrics)[x] as Counter
        )
      })
      .join('\n')
  }

  private formatMs(input: number): string {
    return input > 0
      ? prettyMs(input)
      : prettyMs(input, {formatSubMilliseconds: true})
  }

  private generateHttpStatusRow(key: string, counter: Counter): string {
    return `| HTTP Status ${key.replace('http_status_', '')} | ${
      counter.count
    } |`
  }

  private generateTrendRow(name: string, trend: Trend): string {
    return `| ${name} | ${this.formatMs(trend.avg)} | ${this.formatMs(
      trend.min
    )} | ${this.formatMs(trend.med)} | ${this.formatMs(
      trend.max
    )} | ${this.formatMs(trend.p90)} | ${this.formatMs(trend.p95)} |`
  }
}
