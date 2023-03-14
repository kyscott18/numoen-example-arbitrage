"use strict";

module.exports = {
  extends: ["@saberhq/eslint-config"],
  parserOptions: {
    project: "tsconfig.json",
  },
  ignorePatterns: ["src/gql/*"],
};
