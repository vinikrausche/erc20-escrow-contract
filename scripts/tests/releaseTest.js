const {
  Status,
  assert,
  deployBaseFixture,
  createDeal,
  approveAndDeposit,
  assertStatus,
  printSuccess
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  const fundedDeal = await createDeal(fixture, { saltLabel: "release-funded" });
  await approveAndDeposit(fixture, fundedDeal);

  const beforeBalance = await fixture.token.balanceOf(fixture.payee.address);
  await (await fixture.escrow.connect(fixture.admin).release(fundedDeal.dealId)).wait();

  const releasedDeal = await fixture.escrow.deals(fundedDeal.dealId);
  assertStatus(releasedDeal, Status.Released, "Deal");
  assert.equal(
    await fixture.token.balanceOf(fixture.payee.address),
    beforeBalance + fundedDeal.amount,
    "Payee balance mismatch after release"
  );

  const disputedDeal = await createDeal(fixture, { saltLabel: "release-disputed" });
  await approveAndDeposit(fixture, disputedDeal);
  await (await fixture.escrow.connect(fixture.admin).dispute(disputedDeal.dealId)).wait();
  await (await fixture.escrow.connect(fixture.admin).release(disputedDeal.dealId)).wait();

  const releasedFromDispute = await fixture.escrow.deals(disputedDeal.dealId);
  assertStatus(releasedFromDispute, Status.Released, "Disputed deal");

  printSuccess("releaseTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
