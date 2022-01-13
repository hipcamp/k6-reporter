/* eslint-disable filenames/match-regex */
import {Trend, k6Summary} from './k6-summary'
import {context, getOctokit} from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'
import prettyBytes from 'pretty-bytes'

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
        name: `Load Test Report (${this.baseUrl})`,
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
    )}/s)}
Data Received: ${prettyBytes(
      summary.metrics.data_received.count
    )} (${prettyBytes(summary.metrics.data_received.rate)}/s)}
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
        `
  }

  private generateTrendRow(name: string, trend: Trend): string {
    return `| ${name} | ${trend.avg} | ${trend.min} | ${trend.med} | ${trend.max} | ${trend.p90} | ${trend.p95} |`
  }
}
