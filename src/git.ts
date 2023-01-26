import * as core from '@actions/core'
import * as exec from '@actions/exec'

const BOT_USERNAME = 'github-actions[bot]'
const BOT_EMAIL = 'github-actions[bot]@users.noreply.github.com'

export async function gitCheckoutRef(
  ref: string,
  recursive: boolean
): Promise<void> {
  core.startGroup('Checkout PR branch')
  await exec.exec('git', ['fetch', 'origin', ref])
  await exec.exec('git', ['checkout', '-b', ref, '--track', `origin/${ref}`])
  if (recursive) {
    await exec.exec('git', ['submodule', 'update', '--init', '--recursive'])
  }
  core.endGroup()
}

export async function commitAndPush(files: string[]): Promise<boolean> {
  core.startGroup('Commit changes and pull to PR')
  await exec.exec('git', ['config', 'user.email', BOT_EMAIL])
  await exec.exec('git', ['config', 'user.name', BOT_USERNAME])
  await exec.exec('git', ['add', '--all', '--', ...files])
  const changesForCommit = await exec.exec(
    'git',
    ['diff', '--quiet', '--exit-code', '--staged'],
    {ignoreReturnCode: true}
  )
  if (changesForCommit !== 0) {
    await exec.exec('git', [
      'commit',
      '-m',
      'docs: add documentation generated with slither-documentation'
    ])
    await exec.exec('git', ['push'])
  }
  core.endGroup()

  return changesForCommit !== 0
}
