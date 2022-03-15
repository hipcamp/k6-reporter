import * as core from '@actions/core'
import * as fs from 'fs'
import * as readline from 'readline'
import {ReportService} from './report.service'
import {k6Point} from './k6-point'
import {k6Summary} from './k6-summary'

function getk6Summary(filename: string): k6Summary {
  return JSON.parse(
    fs
      .readFileSync(filename)
      .toString()
      .replace(/p\(90\)/g, 'p90')
      .replace(/p\(95\)/g, 'p95')
  ) as k6Summary
}

async function getk6Points(filename: string): Promise<k6Point[]> {
  const fileStream = fs.createReadStream(filename)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  const points: k6Point[] = []

  for await (const line of rl) {
    if (line.includes('"type":"Point"')) {
      const point: k6Point = JSON.parse(line) as k6Point
      if (point.metric === 'http_reqs') {
        points.push(point)
      }
    }
  }

  return points
}

async function run(): Promise<void> {
  try {
    const name: string = core.getInput('name')
    const filename: string = core.getInput('filename', {required: true})
    const responseFilename: string = core.getInput('response-filename', {
      required: true
    })
    const baseUrl: string = core.getInput('base-url', {required: true})
    const token = core.getInput('github-token', {required: true})

    const summary: k6Summary = getk6Summary(filename)
    const points: k6Point[] = await getk6Points(responseFilename)

    const reportService: ReportService = new ReportService(token, baseUrl)
    const htmlUrl = await reportService.create(name, summary, points)
    core.notice(htmlUrl, {
      title: name
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
