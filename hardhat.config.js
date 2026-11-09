require("@nomicfoundation/hardhat-toolbox");

// Sandbox-only escape hatch: set USE_SOLCJS=1 to compile with the npm-bundled `solc`
// instead of downloading a native compiler. On your laptop you don't need this.
if (process.env.USE_SOLCJS) {
  const { subtask } = require("hardhat/config");
  const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");
  subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
    if (args.solcVersion === "0.8.24") {
      const compilerPath = require.resolve("solc/soljson.js");
      return { compilerPath, isSolcJs: true, version: "0.8.24", longVersion: "0.8.24+commit.e11b9ed9" };
    }
    return runSuper();
  });
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // `npx hardhat node` exposes this at http://127.0.0.1:8545
    localhost: { url: "http://127.0.0.1:8545" },
  },
};
