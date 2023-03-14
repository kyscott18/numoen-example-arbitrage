import type { PublicClient } from "viem";

import { lendgineAbi } from "./abis/lendgine";
import type { parseLendgines } from "./graphql/numoen";

/** Computes a scale to multiply a token by to make it 18 decimals. */
export const tokenExp = (decimals: number) =>
  BigInt(10) ** BigInt(18 - decimals);

/** Ether, the unit. */
export const ether = tokenExp(0);

/** Fetches information about the state of a Lendgine Contract. */
export const getLendgineInfo = async (
  lendgine: ReturnType<typeof parseLendgines>[number],
  client: PublicClient
) => {
  const contracts = [
    {
      address: lendgine.address,
      abi: lendgineAbi,
      functionName: "reserve0",
    },
    {
      address: lendgine.address,
      abi: lendgineAbi,
      functionName: "reserve1",
    },
    {
      address: lendgine.address,
      abi: lendgineAbi,
      functionName: "totalLiquidity",
    },
  ] as const;

  const results = await client.multicall({ contracts, allowFailure: false });

  // Bug in viem that is returning the wrong type
  return {
    reserve0: (results[0] as unknown as { result: bigint }).result,
    reserve1: (results[1] as unknown as { result: bigint }).result,
    liquidity: (results[2] as unknown as { result: bigint }).result,
  } as const;
};

/** Takes some contract state and returns the price exposed by the PMMP exchange. */
export const calcNumoenPrice = (
  lendgine: ReturnType<typeof parseLendgines>[number],
  lendgineInfo: Awaited<ReturnType<typeof getLendgineInfo>>
) => {
  if (lendgineInfo.liquidity === BigInt(0)) return BigInt(0);

  const scaleFactor = tokenExp(lendgine.token1Exp);

  const scale =
    (lendgineInfo.reserve1 * scaleFactor * ether) / lendgineInfo.liquidity;

  return lendgine.upperBound - scale / BigInt(2);
};

/** Determines the amount of token1 to arbitrage with by finding out
 * how much should be bought or sold to reach the target price.
 */
export const calcArbAmount = (
  lendgine: ReturnType<typeof parseLendgines>[number],
  lendgineInfo: Awaited<ReturnType<typeof getLendgineInfo>>,
  targetPrice: bigint
) => {
  const a =
    targetPrice > lendgine.upperBound
      ? BigInt(0)
      : lendgine.upperBound - targetPrice;
  const reserve1 = (a * BigInt(2) * lendgineInfo.liquidity) / ether;

  const adjustedReserve1 = lendgineInfo.reserve1 * tokenExp(lendgine.token1Exp);

  const arb0 = reserve1 > adjustedReserve1;

  return arb0
    ? {
        arb: 0,
        amount: (reserve1 - adjustedReserve1) / tokenExp(lendgine.token1Exp),
      }
    : {
        arb: 1,
        amount: (adjustedReserve1 - reserve1) / tokenExp(lendgine.token1Exp),
      };
};
