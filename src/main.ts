import * as core from '@actions/core'
import * as fs from 'fs'
import {ReportService} from './report.service'
import {k6Summary} from './k6-summary'

async function run(): Promise<void> {
  try {
    const filename: string = core.getInput('file')
    const baseUrl: string = core.getInput('base-url')
    const token = core.getInput('github-token', {required: true})

    const summary: k6Summary = JSON.parse(
      fs.readFileSync(filename).toString()
    ) as k6Summary

    const reportService: ReportService = new ReportService(token, baseUrl)
    await reportService.create(summary)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
