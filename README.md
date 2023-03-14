# Example Arbitrage [![Github Actions][gha-badge]][gha] [![License: MIT][license-badge]][license]

[gha]: https://github.com/numoen/swap-library/actions
[gha-badge]: https://github.com/Numoen/swap-library/actions/workflows/ci.yml/badge.svg
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

**.github/workflows/arbitrage.yml** Is a github action for attempting an arbitrage every 15 minutes. In order for this to work, you must add your private key as a github action secret in a forked github repo and label it `PRIVATE_KEY`.

## Methodology

Each instance of Numoen's PMMP is an automated market makers like Uniswap. Differently from Uniswap, there are multiply PMMPs per token pair depending on which token is being longed or shorted. It is important that the price exposed by each PMMP matches the external market price because this ensures that the derivatives are priced correctly. Failing to arbitrage will not be a critical error but will result in the cost of a PMMP Power Token to not be what traders expect.

Arbitraguers can profit based on the discrepancy in prices between each PMMP and UniswapV2Pair or UniswapV3Pool. This works by buying on one exchange and selling on the other or vice-versa. When prices on a PMMP are higher, it is profitable to sell on a PMMP and buy on an external exchange like UniswapV3Pool.

The smart contract logic of this trade is implemented in [Arbitrage.sol](https://github.com/Numoen/swap-library/blob/master/src/examples/Arbitrage.sol). `arbitrage0` buys on a PMMP and sells on an external exchange while `arbitrage1` sells on a PMMP and buys on an external exchange. This contract takes advantage of flash swaps, where the output of a trade is given to the trader, then allows them to run arbitrage logic, then checks if the proper input was supplied. `Arbitrage.sol` therefore doesn't require the arbitraguer to use any of their own capital to arbitrage, and will revert in the case of an unprofitable trade. `arbitrage0` and `arbitrage1` both take the same paramters. They include parameters for determining which PMMP instance to trade with, which external exchange to trade with, who to send the reward to, and most importantly the amount to arbitrage with. The amount to arbitrage with is the amount of `token1` in the PMMP that is sold on one exchange and bought on the other or vice-versa.

When exchanges are perfectly at balance, the quote price or price exposed by the exchange for an infinitemsaly small trade, are exactly equal. Quote prices in automated market makers depend on the amount of reserves and the trading invariant. Therefore, calculating the optimal amount to pass as `amount` in `Arbitrage.sol` is the amount that causes the quote prices to be exactly equal.

### Improvements

- [ ] Calculate the price impact that will occur on the exchange we are arbing with instead of assuming a fixed amount
- [ ] Don't query the subgraph every time because updates are infrequent and this is slow
- [ ] Websockets is much faster for data querying
- [ ] Determine whether trading on V2 or V3 is more profitable rather than just trading on V3 if V2 doesn't succeed
- [ ] Look at different fee tiers for Uniswap V3 rather than just 0.3%
- [ ] Account for gas when deciding whether to arb or not
- [ ] Trades on the Celo network are reverting, I think this could have something to do with the cGLD precompile not being handled in viem correctly, leading to errors when simulating contract calls
