const {
  Status,
  deployBaseFixture,
  createDeal,
  approveAndDeposit,
  expectRevert,
  assertStatus,
  printSuccess
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  const createdDeal = await createDeal(fixture, { saltLabel: "cancel-created" });
  await (await fixture.escrow.connect(fixture.admin).cancel(createdDeal.dealId)).wait();

  const cancelledDeal = await fixture.escrow.deals(createdDeal.dealId);
  assertStatus(cancelledDeal, Status.Cancelled, "Deal");

  const fundedDeal = await createDeal(fixture, { saltLabel: "cancel-funded" });
  await approveAndDeposit(fixture, fundedDeal);

  await expectRevert(
    fixture.escrow.connect(fixture.admin).cancel(fundedDeal.dealId),
    "Invalid status"
  );

  printSuccess("cancelTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
