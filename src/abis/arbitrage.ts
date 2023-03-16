export const arbitrageAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_factory",
        type: "address",
      },
      {
        internalType: "address",
        name: "_uniswapV2Factory",
        type: "address",
      },
      {
        internalType: "address",
        name: "_uniswapV3Factory",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "BalanceReturnError",
    type: "error",
  },
  {
    inputs: [],
    name: "FailedTransfer",
    type: "error",
  },
  {
    inputs: [],
    name: "NotProfitable",
    type: "error",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "token0",
            type: "address",
          },
          {
            internalType: "address",
            name: "token1",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "token0Exp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token1Exp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "upperBound",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "enum SwapHelper.SwapType",
            name: "swapType",
            type: "uint8",
          },
          {
            internalType: "bytes",
            name: "swapExtraData",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
        ],
        internalType: "struct Arbitrage.ArbitrageParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "arbitrage0",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "token0",
            type: "address",
          },
          {
            internalType: "address",
            name: "token1",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "token0Exp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token1Exp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "upperBound",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "enum SwapHelper.SwapType",
            name: "swapType",
            type: "uint8",
          },
          {
            internalType: "bytes",
            name: "swapExtraData",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
        ],
        internalType: "struct Arbitrage.ArbitrageParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "arbitrage1",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount0Out",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1Out",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "swapCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Factory",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV3Factory",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "amount0Delta",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "amount1Delta",
        type: "int256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "uniswapV3SwapCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
