import * as core from '@actions/core'
import * as git from './git'
import * as github from '@actions/github'
import * as slither from './slither'

type Octokit = ReturnType<typeof github.getOctokit>

function isContextValid(): boolean {
  return (
    github.context.eventName === 'pull_request' &&
    github.context.payload.action === 'labeled' &&
    github.context.payload.label.name === core.getInput('trigger-label')
  )
}

async function getChangedFiles(octokit: Octokit): Promise<string[]> {
  const context = github.context

  const listFilesOptions = octokit.rest.pulls.listFiles.endpoint.merge({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number
  })
  const listFilesResponse = await octokit.paginate<{filename: string}>(
    listFilesOptions
  )
  const changedFiles = listFilesResponse.map(f => f.filename)
  core.debug(`Changed files: ${changedFiles}`)
  return changedFiles
}

async function getPullRequestBranch(octokit: Octokit): Promise<string | null> {
  const context = github.context

  const pullRequest = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number
  })

  if (
    `${context.repo.owner}/${context.repo.repo}` !==
    pullRequest.data.head.repo?.full_name
  ) {
    return null
  }
  return pullRequest.data.head.ref
}

async function removeLabel(octokit: Octokit, label: string): Promise<void> {
  const context = github.context

  await octokit.rest.issues.removeLabel({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    name: label
  })
}

async function alertStatus(octokit: Octokit, message: string): Promise<void> {
  const context = github.context

  await octokit.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: message
  })
}

async function document(): Promise<void> {
  const github_token = core.getInput('github-token')
  const openai_token = core.getInput('openai-api-key')
  const target = core.getInput('target')
  const solcVersion = core.getInput('solc-version')
  const slitherVersion = core.getInput('slither-version')
  const label = core.getInput('trigger-label')
  const octokit = github.getOctokit(github_token)

  const changed_files = await getChangedFiles(octokit)
  const changed_sol = changed_files.filter(f => f.endsWith('.sol'))

  if (changed_sol.length === 0) {
    core.debug('No code changed')
    return
  }

  const branch = await getPullRequestBranch(octokit)
  if (branch === null) {
    core.info('PR is not from this repo, cannot proceed')
    return
  }

  await slither.install(slitherVersion, solcVersion)
  await git.gitCheckoutRef(branch, true)
  await slither.runSlitherDocumentation(target, openai_token)
  const pushedChanges = await git.commitAndPush(changed_sol)
  await removeLabel(octokit, label)

  const message = pushedChanges
    ? 'Documentation was generated and pushed to the repository 🚀'
    : 'slither-documentation did not generate any changes 🤷'
  await alertStatus(octokit, message)
}

async function run(): Promise<void> {
  try {
    if (isContextValid()) {
      await document()
    } else {
      core.setFailed(
        'The action was ran on an event different than pull_request. This is unsupported,'
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      const octokit = github.getOctokit(core.getInput('github-token'))
      await alertStatus(
        octokit,
        `An error occured 😔 ${error.message}\n\n` +
          'Please review the GitHub Actions workflow execution for more details.'
      )
      core.setFailed(error.message)
    }
  }
}

run()
