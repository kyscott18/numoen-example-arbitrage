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

  // From the invariant in the Numoen PMMP R1/L = 2 * (UpperBound - Price)
  // or Price = UpperBound - R1/2L
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
  // We want the price on Numoen to match the targetPrice
  // From the Numoen PMMP invariant, it can be derived that R1/L = 2 * (UpperBound - Price)
  // We use this with Price = targetPrice to determine the target amuont of R1
  const a =
    targetPrice > lendgine.upperBound
      ? BigInt(0)
      : lendgine.upperBound - targetPrice;

  const targetR1 = (a * BigInt(2) * lendgineInfo.liquidity) / ether;

  // Adjust r1 for decimals
  const adjustedReserve1 = lendgineInfo.reserve1 * tokenExp(lendgine.token1Exp);

  // If we need to add token1 to reach the target, this means we sell R1 on a Numoen PMMP and buy it on an external market
  const arb0 = targetR1 > adjustedReserve1;

  // Amount is the amount that we must move in or out of the PMMP instance to reach the target
  return arb0
    ? {
        arb: 0,
        amount: (targetR1 - adjustedReserve1) / tokenExp(lendgine.token1Exp),
      }
    : {
        arb: 1,
        amount: (adjustedReserve1 - targetR1) / tokenExp(lendgine.token1Exp),
      };
};
