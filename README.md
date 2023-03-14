# Example Arbitrage [![Github Actions][gha-badge]][gha] [![Foundry][foundry-badge]][foundry] [![License: MIT][license-badge]][license]

[gha]: https://github.com/numoen/swap-library/actions
[gha-badge]: https://github.com/Numoen/swap-library/actions/workflows/ci.yml/badge.svg
[foundry]: https://getfoundry.sh/
[foundry-badge]: https://img.shields.io/badge/Built%20with-Foundry-FFDB1C.svg
[license]: https://opensource.org/licenses/MIT
[license-badge]: https://img.shields.io/badge/License-MIT-blue.svg

An example contract of how to arbitrage between Numoen pools and Uniswap V2 or V3 style exchanges. This expands upon example contracts in [the Numoen swap library](https://github.com/Numoen/swap-library), specifically [Arbitrage.sol](https://github.com/Numoen/swap-library/blob/master/src/examples/Arbitrage.sol)

## Development

### Install

Install the dependencies:

```sh
pnpm install
```

### Codegen

Generate graphql types:

```sh
pnpm graphql-codegen
```

### Arbitrage

Attempt an arbitrage:

```sh
pnpm arb
```

### Lint

Lint our code with eslint:

```sh
pnpm lint
```

### Typecheck

Use the Typescript typechecker:

```sh
pnpm typecheck
```

## Automation

**.github.workflows.arbitrage.ymp** Is a github action for attempting an arbitrage every 15 minutes. In order for this to work, you must add your private key as a github action secret in a forked github repo and label it `PRIVATE_KEY`.

## Methodology

### Assumptions

### Improvements
