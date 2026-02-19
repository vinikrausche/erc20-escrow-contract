const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ERC20Escrow", function () {
  async function deployFixture() {
    const [deployer, admin, payer, payee, arbiter, other] = await ethers.getSigners();
    const escrowAmount = ethers.parseEther("100");

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Mock USD", "mUSD");
    await token.waitForDeployment();

    await (await token.mint(payer.address, escrowAmount)).wait();

    const ERC20Escrow = await ethers.getContractFactory("ERC20Escrow");
    const escrow = await upgrades.deployProxy(ERC20Escrow, [admin.address], {
      initializer: "initialize",
      kind: "uups"
    });
    await escrow.waitForDeployment();

    const salt = ethers.id("hardhat-test-salt");
    const deadline = 0;
    await (await escrow.connect(admin).createDeal(
      payer.address,
      payee.address,
      arbiter.address,
      await token.getAddress(),
      escrowAmount,
      deadline,
      salt
    )).wait();

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const dealId = ethers.keccak256(
      abiCoder.encode(
        ["address", "address", "address", "address", "uint256", "uint64", "bytes32"],
        [payer.address, payee.address, arbiter.address, await token.getAddress(), escrowAmount, deadline, salt]
      )
    );

    return { deployer, admin, payer, payee, arbiter, other, escrowAmount, token, escrow, dealId };
  }

  it("deposits and releases to payee", async function () {
    const { admin, payer, payee, escrowAmount, token, escrow, dealId } = await deployFixture();

    await (await token.connect(payer).approve(await escrow.getAddress(), escrowAmount)).wait();
    await (await escrow.connect(admin).deposit(dealId)).wait();
    await (await escrow.connect(admin).release(dealId)).wait();

    expect(await token.balanceOf(payee.address)).to.equal(escrowAmount);
  });

  it("deposits and refunds to payer", async function () {
    const { admin, payer, escrowAmount, token, escrow, dealId } = await deployFixture();

    await (await token.connect(payer).approve(await escrow.getAddress(), escrowAmount)).wait();
    await (await escrow.connect(admin).deposit(dealId)).wait();
    await (await escrow.connect(admin).refund(dealId)).wait();

    expect(await token.balanceOf(payer.address)).to.equal(escrowAmount);
  });

  it("reverts when outsider tries to pause", async function () {
    const { other, escrow } = await deployFixture();

    await expect(escrow.connect(other).pause()).to.be.reverted;
  });
});
