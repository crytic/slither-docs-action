import * as io from '@actions/io'
import * as path from 'path'
import {ok} from 'assert'
import {v4 as uuidv4} from 'uuid'

function getRunnerTempDir(): string {
  const tempDirectory = process.env['RUNNER_TEMP'] || ''
  ok(tempDirectory, 'Expected RUNNER_TEMP to be defined')
  return tempDirectory
}

export async function createTempDir(): Promise<string> {
  const dest = path.join(getRunnerTempDir(), uuidv4())
  await io.mkdirP(dest)
  return dest
}
