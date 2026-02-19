const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Missing PROXY_ADDRESS environment variable.");
  }

  const [operator] = await ethers.getSigners();
  const ERC20Escrow = await ethers.getContractFactory("ERC20Escrow");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, ERC20Escrow, {
    kind: "uups"
  });
  await upgraded.waitForDeployment();

  console.log("Upgrade executor:", operator.address);
  console.log("Proxy:", proxyAddress);
  console.log(
    "New Implementation:",
    await upgrades.erc1967.getImplementationAddress(proxyAddress)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
