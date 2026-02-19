const {
  Status,
  assert,
  deployBaseFixture,
  createDeal,
  approveAndDeposit,
  expectRevert,
  assertStatus,
  printSuccess
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  const dealWithArbiter = await createDeal(fixture, {
    saltLabel: "dispute-with-arbiter"
  });
  await approveAndDeposit(fixture, dealWithArbiter);
  await (await fixture.escrow.connect(fixture.admin).dispute(dealWithArbiter.dealId)).wait();

  const disputedDeal = await fixture.escrow.deals(dealWithArbiter.dealId);
  assertStatus(disputedDeal, Status.Disputed, "Deal");

  const dealWithoutArbiter = await createDeal(fixture, {
    arbiter: "0x0000000000000000000000000000000000000000",
    saltLabel: "dispute-no-arbiter"
  });
  await approveAndDeposit(fixture, dealWithoutArbiter);

  await expectRevert(
    fixture.escrow.connect(fixture.admin).dispute(dealWithoutArbiter.dealId),
    "No arbiter"
  );

  printSuccess("disputeTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
