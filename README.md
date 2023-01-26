# Document with Slither

Documenting your code can be tiresome. This action will help you write
documentation for your code in pull requests using Slither and OpenAI. Just
label your PR with `generate-docs` and the action will get it done!

> **Note**
>
> As this action pushes the documentation to the same pull request branch, it
> only works on pull requests from the same repository. If you trigger the
> workflow on a pull request originating from a fork, it will display an error.

## Usage

This action needs to be run on a `pull_request` event of type `labeled`. The
workflow needs to have `contents: write` permissions (to push documentation
commits to your PR) and `pull-requests: write` permissions (to untag and leave
comments on your PR)

You will also need an OpenAI API key. You can create one in the OpenAI website,
by clicking on your profile picture, followed by the ["View API
keys"](https://platform.openai.com/account/api-keys) link.

> **Warning**
>
> This action will transmit code from your repository to OpenAI during normal
> operation. Review OpenAI's terms of service and privacy policy to see how your
> data will be processed, used, or stored.

Once you have acquired your API key, store it as an Actions secret for the
GitHub repository. You may follow the instructions in the [GitHub
documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository)
to do so.

> **Warning**
>
> The OpenAI API is a paid service. The requests that Slither performs to
> OpenAI's API endpoints cost money. Make sure you trust all the contributors
> with access to your repository, which may invoke this action with your API
> key. Configure adequate cost limits and alerts in OpenAI to avoid unexpected
> bills.

```yaml
- name: Document with Slither
  uses: crytic/slither-docs-action@v0
  with:
    target: project
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### Options

| Key              | Description
|------------------|------------
| `target`         | The path to the root of the project to be documented by Slither. It can be a directory or a file, and it defaults to the repo root.
| `openai-api-key` | The OpenAI API key.
| `trigger-label`  | The label used to trigger the action. `generate-docs` by default.
| `slither-version`| The version of slither-analyzer to use. By default, the latest release in PyPI is used.
| `solc-version`   | The version of `solc` to use. **This only has an effect if you are not using a compilation framework for your project** -- i.e., if `target` is a standalone `.sol` file.
| `github-token`   | GitHub token, used to compute PR differences and push documentation. By default, it will use the workflow token, and there should be no need to override it.

## Examples

These examples assume you have a valid OpenAI API key stored as a secret named
`OPENAI_API_KEY` in your GitHub repository.

### Example: Hardhat

```yaml
name: Document with Slither

on:
  pull_request:
    types: [labeled]
    branches: [main]

jobs:
  document:
    name: Document with Slither
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'generate-docs')
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js 16.x
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: Install dependencies
        working-directory: project
        run: npm ci

      - name: Document with Slither
        uses: crytic/slither-docs-action@v0
        with:
          target: project
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### Example: Foundry

```yaml
name: Document with Slither

on:
  pull_request:
    types: [labeled]
    branches: [main]

jobs:
  document:
    name: Document with Slither
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'generate-docs')
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1

      - name: Document with Slither
        uses: crytic/slither-docs-action@v0
        with:
          target: project
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```
