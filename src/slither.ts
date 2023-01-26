import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as path from 'path'

import {createTempDir} from './utils'

export async function install(slither: string, solc: string): Promise<void> {
  core.startGroup('Install Slither')
  const venv = await createTempDir()
  const exitCodeVenv = await exec.exec('python3', ['-m', 'venv', venv])
  if (exitCodeVenv !== 0) {
    throw new Error('Problem creating Python venv')
  }

  let slitherPackage = 'slither-analyzer'
  if (slither === 'latest') {
    // nothing
  } else if (/^\d+\.\d+\.\d+$/.test(slither)) {
    slitherPackage += `==${slither}`
  } else {
    slitherPackage += ` @ https://github.com/crytic/slither/archive/${slither}.tar.gz`
  }

  core.addPath(path.join(venv, 'bin'))
  const exitCodePip = await exec.exec('pip3', [
    'install',
    '--quiet',
    slitherPackage,
    'openai',
    'solc-select'
  ])
  if (exitCodePip !== 0) {
    throw new Error('Problem installing Slither into venv')
  }

  if (solc !== '' && solc !== 'none') {
    const exitSolcSelect = await exec.exec('solc-select', [
      'use',
      solc,
      '--always-install'
    ])
    if (exitSolcSelect !== 0) {
      throw new Error('Problem installing Slither into venv')
    }
  }
  core.endGroup()
}

export async function runSlitherDocumentation(
  target: string,
  openaiToken: string
): Promise<void> {
  core.startGroup('Run slither-documentation')
  const options = {
    env: {...process.env, OPENAI_API_KEY: openaiToken}
  } as exec.ExecOptions
  const extraArgs = core.isDebug() ? ['--codex-log'] : []
  const output = await exec.getExecOutput(
    'slither-documentation',
    [target, '--overwrite', '--force-answer-parsing', ...extraArgs],
    options
  )

  if (output.exitCode !== 0) {
    throw new Error('Problem executing slither-documentation')
  }
  core.endGroup()

  if (core.isDebug()) {
    core.startGroup('Show codex log')
    const logPath = path.join('crytic_export', 'codex')
    const displayed = await exec.exec('grep', ['-Hr', '.', logPath], {
      ignoreReturnCode: true
    })
    if (displayed !== 0) {
      core.warning('Log not found')
    }
    core.endGroup()
  }
}
