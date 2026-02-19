const {
  assert,
  deployBaseFixture,
  createDeal,
  expectRevert,
  printSuccess
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  await (await fixture.escrow.connect(fixture.admin).pause()).wait();
  await expectRevert(fixture.escrow.connect(fixture.outsider).unpause());

  await (await fixture.escrow.connect(fixture.admin).unpause()).wait();
  assert.equal(await fixture.escrow.paused(), false, "Contract must be unpaused");

  const deal = await createDeal(fixture, { saltLabel: "unpause-test" });
  const storedDeal = await fixture.escrow.deals(deal.dealId);
  assert.equal(Number(storedDeal.status), 1, "Deal must be created after unpause");

  printSuccess("unpauseTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
