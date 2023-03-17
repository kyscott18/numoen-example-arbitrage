import type { Address } from "viem";
import { getAddress } from "viem/utils";

import type { LendginesQuery } from "../gql/numoen/graphql";

/** Takes the result of a graphql query and formats it. */
export const parseLendgines = (
  lendginesQuery: LendginesQuery
): {
  token0: Address;
  token1: Address;
  token0Exp: number;
  token1Exp: number;
  upperBound: bigint;
  address: Address;
}[] => {
  return lendginesQuery.lendgines.map((l) => ({
    token0: getAddress(l.token0.id),
    token1: getAddress(l.token1.id),
    token0Exp: +l.token0Exp,
    token1Exp: +l.token1Exp,
    upperBound: BigInt(l.upperBound),
    address: getAddress(l.id),
  }));
};
