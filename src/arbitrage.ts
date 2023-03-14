import dotenv from "dotenv";
import { Wallet } from "ethers";
import { GraphQLClient } from "graphql-request";
import type { PublicClient } from "viem";
import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  http,
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
  arbitrum: "0xD5A55e55b891848c0795fc7EbD381C0e119e01eB",
  celo: "0xD5A55e55b891848c0795fc7EbD381C0e119e01eB",
} as const;

const arbitrage = async (chain: keyof typeof supportedNetworks) => {
  dotenv.config();
  const graphqlClient = new GraphQLClient(subgraphEndpoints[chain]);

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

    const expectedPriceImpact = 1000;

    const uniV2Arb =
      uniV2Price &&
      calcArbAmount(
        l,
        lendgineInfo,
        numoenPrice > uniV2Price
          ? (uniV2Price * BigInt(expectedPriceImpact + 3000)) /
              BigInt(1_000_000)
          : (uniV2Price * BigInt(1_000_000 - (expectedPriceImpact + 3000))) /
              BigInt(1_000_000)
      );
    const uniV3Arb = uniV3Price && calcArbAmount(l, lendgineInfo, uniV3Price);

    if (uniV2Arb) {
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
              swapExtraData: encodePacked(["uint24"], [3000]),
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
      } catch (err) {
        console.log("swap on Uniswap V2 failed", err);
      }
    }

    if (uniV3Arb) {
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
              swapExtraData: encodePacked(["uint24"], [3000]),
              recipient: account.address,
            },
          ],
          chain: supportedNetworks[chain],
          account,
        });
        console.log(request);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await walletClient.writeContract(request);
        console.log("swap on Uniswap V3 passed");
      } catch (err) {
        console.log("swap on Uniswap V3 failed", err);
      }
    }
  }
};

// attempt the arb
Promise.all([arbitrage("arbitrum")]).catch((err) => {
  console.error(err);
});
