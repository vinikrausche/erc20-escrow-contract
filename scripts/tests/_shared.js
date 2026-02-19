const assert = require("node:assert/strict");
const { ethers, upgrades } = require("hardhat");

const Status = Object.freeze({
  None: 0,
  Created: 1,
  Funded: 2,
  Released: 3,
  Refunded: 4,
  Disputed: 5,
  Cancelled: 6
});

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function computeDealId({ payer, payee, arbiter, token, amount, deadline, salt }) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return ethers.keccak256(
    abiCoder.encode(
      ["address", "address", "address", "address", "uint256", "uint64", "bytes32"],
      [payer, payee, arbiter, token, amount, deadline, salt]
    )
  );
}

async function deployBaseFixture() {
  const [deployer, admin, payer, payee, arbiter, outsider] = await ethers.getSigners();

  const tokenFactory = await ethers.getContractFactory("MockERC20");
  const token = await tokenFactory.deploy("Mock USD", "mUSD");
  await token.waitForDeployment();

  const tokenSupply = ethers.parseUnits("1000000", 18);
  await (await token.mint(payer.address, tokenSupply)).wait();

  const escrowFactory = await ethers.getContractFactory("ERC20Escrow");
  const escrow = await upgrades.deployProxy(escrowFactory, [admin.address], {
    initializer: "initialize",
    kind: "uups"
  });
  await escrow.waitForDeployment();

  const defaultAmount = ethers.parseUnits("100", 18);

  return {
    deployer,
    admin,
    payer,
    payee,
    arbiter,
    outsider,
    token,
    escrow,
    defaultAmount
  };
}

async function createDeal(fixture, overrides = {}) {
  const payer = overrides.payer ?? fixture.payer.address;
  const payee = overrides.payee ?? fixture.payee.address;
  const arbiter = overrides.arbiter ?? fixture.arbiter.address;
  const token = overrides.token ?? (await fixture.token.getAddress());
  const amount = overrides.amount ?? fixture.defaultAmount;
  const deadline = overrides.deadline ?? 0;
  const salt = overrides.salt ?? ethers.id(overrides.saltLabel ?? "deal-default");

  await (
    await fixture.escrow
      .connect(fixture.admin)
      .createDeal(payer, payee, arbiter, token, amount, deadline, salt)
  ).wait();

  return {
    dealId: computeDealId({ payer, payee, arbiter, token, amount, deadline, salt }),
    payer,
    payee,
    arbiter,
    token,
    amount,
    deadline,
    salt
  };
}

async function approveAndDeposit(fixture, deal) {
  const escrowAddress = await fixture.escrow.getAddress();
  await (await fixture.token.connect(fixture.payer).approve(escrowAddress, deal.amount)).wait();
  await (await fixture.escrow.connect(fixture.admin).deposit(deal.dealId)).wait();
}

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function expectRevert(txPromise, expectedReason) {
  try {
    await txPromise;
    assert.fail("Expected transaction to revert");
  } catch (error) {
    if (!expectedReason) {
      return;
    }

    const message = String(error);
    assert(
      message.includes(expectedReason),
      `Expected revert reason to include \"${expectedReason}\" but received \"${message}\"`
    );
  }
}

function assertStatus(deal, expectedStatus, label) {
  assert.equal(Number(deal.status), expectedStatus, `${label} status mismatch`);
}

function printSuccess(testName) {
  console.log(`[PASS] ${testName}`);
}

module.exports = {
  Status,
  assert,
  nowSeconds,
  deployBaseFixture,
  createDeal,
  approveAndDeposit,
  increaseTime,
  expectRevert,
  assertStatus,
  printSuccess
};
