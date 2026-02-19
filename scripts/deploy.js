const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer, admin] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Mock USD", "mUSD");
  await token.waitForDeployment();

  const ERC20Escrow = await ethers.getContractFactory("ERC20Escrow");
  const escrow = await upgrades.deployProxy(ERC20Escrow, [admin.address], {
    initializer: "initialize",
    kind: "uups"
  });
  await escrow.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("Admin:", admin.address);
  console.log("Token:", await token.getAddress());
  console.log("Escrow Proxy:", await escrow.getAddress());
  console.log("Escrow Implementation:", await upgrades.erc1967.getImplementationAddress(await escrow.getAddress()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
