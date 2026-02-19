const { ethers } = require("hardhat");
const {
  assert,
  deployBaseFixture,
  expectRevert,
  printSuccess
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  await expectRevert(fixture.escrow.connect(fixture.outsider).pause());

  await (await fixture.escrow.connect(fixture.admin).pause()).wait();
  assert.equal(await fixture.escrow.paused(), true, "Contract must be paused");

  await expectRevert(
    fixture.escrow
      .connect(fixture.admin)
      .createDeal(
        fixture.payer.address,
        fixture.payee.address,
        fixture.arbiter.address,
        await fixture.token.getAddress(),
        fixture.defaultAmount,
        0,
        ethers.id("pause-test")
      )
  );

  printSuccess("pauseTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
