import dotenv from "dotenv";
import { Wallet } from "ethers";
import { GraphQLClient } from "graphql-request";
import type { PublicClient } from "viem";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  parseAbiParameters,
} from "viem";
import { arbitrum, celo } from "viem/chains";
import { getAccount } from "viem/ethers";

import { arbitrageAbi } from "./abis/arbitrage";
import { LendginesDocument } from "./gql/numoen/graphql";
import { parseLendgines } from "./graphql/numoen";
import { calcArbAmount, calcNumoenPrice, getLendgineInfo } from "./numoen";
import { getUniswapV2Price, getUniswapV3Price } from "./uniswap";

const supportedNetworks = { celo: celo, arbitrum: arbitrum };

const subgraphEndpoints = {
  arbitrum: "https://api.thegraph.com/subgraphs/name/kyscott18/numoen-arbitrum",
  celo: "https://api.thegraph.com/subgraphs/name/kyscott18/numoen-celo",
};

const arbitrageAddress = {
  arbitrum: "0x6773CcD8AEB3c172878F6D44Accd53a2d9401712",
  celo: "0x2df49c3Fb173585e69f9D7748A073DcBc56c6Ce0",
} as const;

const arbitrage = async (chain: keyof typeof supportedNetworks) => {
  // load the environment variables
  dotenv.config();
  const graphqlClient = new GraphQLClient(subgraphEndpoints[chain]);

  // setup a viem client for reading public data and signing with a wallet
  const walletClient = createWalletClient({
    chain: supportedNetworks[chain],
    transport: http(supportedNetworks[chain].rpcUrls.default.http[0]),
  });
  const publicClient = createPublicClient({
    chain: supportedNetworks[chain],
    transport: http(supportedNetworks[chain].rpcUrls.default.http[0]),
  });

  // viem doesn't have first class support for signing with a private key, uses an ethers adapter
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const account = getAccount(new Wallet(process.env.PRIVATE_KEY!));

  // Query all existing Lendgines (Lendgine engines) using the Numoen subgraph with a auto-generate query
  const lendgines = parseLendgines(
    await graphqlClient.request(LendginesDocument)
  );

  for (const l of lendgines) {
    const lendgineInfo = await getLendgineInfo(l, publicClient as PublicClient);
    const numoenPrice = calcNumoenPrice(l, lendgineInfo);

    const uniV2Price = await getUniswapV2Price(
      [
        { address: l.token0, decimals: l.token0Exp },
        { address: l.token1, decimals: l.token1Exp },
      ],
      publicClient as PublicClient,
      chain
    );
    const uniV3Price = await getUniswapV3Price(
      [
        { address: l.token0, decimals: l.token0Exp },
        { address: l.token1, decimals: l.token1Exp },
      ],
      publicClient as PublicClient,
      chain
    );

    // Determing the amount is an approximation. We aren't factoring in price impact that trading
    // on Uniswap could have. Instead, we just set a max price impact that estimate.
    // If the real price impact is greater than this, we start to over arb which could cause
    // the trade to not be profitable. If the real price impact is less the estimate, we under arb
    // which leaves some profit on the table
    const expectedPriceImpact = 1000n;

    // Account for slippage and fees in the Uniswap price
    const adjustPrice = (uniswapPrice: bigint) =>
      numoenPrice > uniswapPrice
        ? (uniswapPrice * (1_000_000n + expectedPriceImpact + 3000n)) /
          1_000_000n
        : (uniswapPrice * (1_000_000n - (3000n + expectedPriceImpact))) /
          1_000_000n;

    const arbExists = (uniswapPrice: bigint) =>
      numoenPrice > uniswapPrice
        ? numoenPrice > adjustPrice(uniswapPrice)
        : numoenPrice < adjustPrice(uniswapPrice);

    // calculate the optimal arbitrage amount
    const uniV2Arb =
      !!uniV2Price && arbExists(uniV2Price)
        ? calcArbAmount(l, lendgineInfo, adjustPrice(uniV2Price))
        : undefined;
    const uniV3Arb =
      !!uniV3Price && arbExists(uniV3Price)
        ? calcArbAmount(l, lendgineInfo, adjustPrice(uniV3Price))
        : undefined;

    // only trade on v3 if v2 doesn't work
    let v2Success = false;
    if (uniV2Arb && uniV2Arb.amount > 0n) {
      try {
        const { request } = await publicClient.simulateContract({
          address: arbitrageAddress[chain],
          abi: arbitrageAbi,
          functionName: uniV2Arb.arb === 0 ? "arbitrage0" : "arbitrage1",
          args: [
            {
              token0: l.token0,
              token1: l.token1,
              token0Exp: BigInt(l.token0Exp),
              token1Exp: BigInt(l.token1Exp),
              upperBound: l.upperBound,
              amount: uniV2Arb.amount,
              swapType: 0,
              swapExtraData: encodeAbiParameters(parseAbiParameters("uint24"), [
                3000,
              ]),
              recipient: account.address,
            },
          ],
          chain: supportedNetworks[chain],
          account,
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await walletClient.writeContract(request);
        console.log("swap on Uniswap V2 passed");
        v2Success = true;
      } catch (err) {
        console.log("swap on Uniswap V2 failed");
      }
    }

    if (!v2Success && uniV3Arb && uniV3Arb.amount > 0n) {
      try {
        const { request } = await publicClient.simulateContract({
          address: arbitrageAddress[chain],
          abi: arbitrageAbi,
          functionName: uniV3Arb.arb === 0 ? "arbitrage0" : "arbitrage1",
          args: [
            {
              token0: l.token0,
              token1: l.token1,
              token0Exp: BigInt(l.token0Exp),
              token1Exp: BigInt(l.token1Exp),
              upperBound: l.upperBound,
              amount: uniV3Arb.amount,
              swapType: 1,
              swapExtraData: encodeAbiParameters(parseAbiParameters("uint24"), [
                3000,
              ]),
              recipient: account.address,
            },
          ],
          chain: supportedNetworks[chain],
          account,
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await walletClient.writeContract(request);
        console.log("swap on Uniswap V3 passed");
      } catch (err) {
        console.log("swap on Uniswap V3 failed");
      }
    }
  }
};

// attempt the arb
Promise.all([arbitrage("celo"), arbitrage("arbitrum")]).catch((err) => {
  console.error(err);
  process.exit(1);
});
