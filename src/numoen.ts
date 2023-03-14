import type { PublicClient } from "viem";

import { lendgineAbi } from "./abis/lendgine";
import type { parseLendgines } from "./graphql/numoen";

export const tokenExp = (decimals: number) =>
  BigInt(10) ** BigInt(18 - decimals);
export const ether = tokenExp(0);

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

export const calcArbAmount = (
  lendgine: ReturnType<typeof parseLendgines>[number],
  lendgineInfo: Awaited<ReturnType<typeof getLendgineInfo>>,
  targetPrice: bigint
) => {
  const reserve1 =
    ((targetPrice > lendgine.upperBound
      ? BigInt(0)
      : lendgine.upperBound - targetPrice) *
      BigInt(2) *
      lendgineInfo.liquidity) /
    ether;

  const arb0 = reserve1 > lendgineInfo.reserve1;

  return arb0
    ? {
        arb: 0,
        amount:
          (reserve1 - lendgineInfo.reserve1) / tokenExp(lendgine.token1Exp),
      }
    : {
        arb: 1,
        amount:
          (lendgineInfo.reserve1 - reserve1) / tokenExp(lendgine.token1Exp),
      };
};
