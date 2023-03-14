import { getCreate2Address } from "ethers";
import type { Address, PublicClient } from "viem";
import {
  encodeAbiParameters,
  encodePacked,
  keccak256,
  parseAbiParameters,
} from "viem";

import { uniswapV2PairAbi } from "./abis/uniswapV2Pair";
import { uniswapV3Pool } from "./abis/uniswapV3Pool";
import { ether, tokenExp } from "./numoen";

const univ2 = {
  arbitrum: {
    factoryAddress: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    pairInitCodeHash:
      "0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303",
  },
  celo: {
    factoryAddress: "0x62d5b84bE28a183aBB507E125B384122D2C25fAE",
    pairInitCodeHash:
      "0xb3b8ff62960acea3a88039ebcf80699f15786f1b17cebd82802f7375827a339c",
  },
} as const;

const sortTokens = (
  tokens: readonly [
    { address: Address; decimals: number },
    { address: Address; decimals: number }
  ]
) =>
  tokens[0].address.toLowerCase() < tokens[1].address.toLowerCase()
    ? tokens
    : ([tokens[1], tokens[0]] as const);

/** Fetches the current quote price on Uniswap V2. */
export const getUniswapV2Price = async (
  tokens: readonly [
    { address: Address; decimals: number },
    { address: Address; decimals: number }
  ],

  client: PublicClient,
  chain: keyof typeof univ2
) => {
  const sortedTokens = sortTokens(tokens);
  const flipped = sortedTokens[0].address !== tokens[0].address;

  const pairAddress = getCreate2Address(
    univ2[chain].factoryAddress,
    keccak256(
      encodePacked(
        ["address", "address"],
        [sortedTokens[0].address, sortedTokens[1].address]
      )
    ),
    univ2[chain].pairInitCodeHash
  );

  // pair might not exist, so we should return undefined if it fails
  try {
    const result = await client.readContract({
      abi: uniswapV2PairAbi,
      address: pairAddress as Address,
      functionName: "getReserves",
    });
    return flipped
      ? (result[1] * tokenExp(sortedTokens[1].decimals) * ether) /
          (result[0] * tokenExp(sortedTokens[0].decimals))
      : (result[0] * tokenExp(sortedTokens[0].decimals) * ether) /
          (result[1] * tokenExp(sortedTokens[1].decimals));
  } catch {
    return undefined;
  }
};

const univ3 = {
  arbitrum: {
    factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    pairInitCodeHash:
      "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54",
  },
  celo: {
    factoryAddress: "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc",
    pairInitCodeHash:
      "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54",
  },
} as const;

/** Fetches the current quote price on Uniswap V3. */
export const getUniswapV3Price = async (
  tokens: readonly [
    { address: Address; decimals: number },
    { address: Address; decimals: number }
  ],

  client: PublicClient,
  chain: keyof typeof univ3
) => {
  const sortedTokens = sortTokens(tokens);
  const flipped = sortedTokens[0].address !== tokens[0].address;

  const poolAddress = getCreate2Address(
    univ3[chain].factoryAddress,
    keccak256(
      encodeAbiParameters(parseAbiParameters("address, address, uint24"), [
        sortedTokens[0].address,
        sortedTokens[1].address,
        3000,
      ])
    ),
    univ3[chain].pairInitCodeHash
  );

  console.log(poolAddress);
  // pair might not exist, so we should return undefined if it fails
  try {
    const result = await client.readContract({
      abi: uniswapV3Pool,
      address: poolAddress as Address,
      functionName: "slot0",
    });
    const price = result[0] ** BigInt(2) / BigInt(2) ** BigInt(192);

    return flipped
      ? (price * tokenExp(sortedTokens[1].decimals)) /
          tokenExp(sortedTokens[0].decimals)
      : (price * tokenExp(sortedTokens[0].decimals)) /
          tokenExp(sortedTokens[1].decimals);
  } catch {
    return undefined;
  }
};
