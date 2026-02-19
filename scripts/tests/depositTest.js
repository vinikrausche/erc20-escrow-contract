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

  const deal = await createDeal(fixture, { saltLabel: "deposit-test" });
  await approveAndDeposit(fixture, deal);

  const storedDeal = await fixture.escrow.deals(deal.dealId);
  assert.equal(storedDeal.funded, deal.amount, "Funded amount mismatch");
  assertStatus(storedDeal, Status.Funded, "Deal");

  assert.equal(
    await fixture.token.balanceOf(await fixture.escrow.getAddress()),
    deal.amount,
    "Escrow token balance mismatch"
  );

  await expectRevert(
    fixture.escrow.connect(fixture.admin).deposit(deal.dealId),
    "Invalid status"
  );

  printSuccess("depositTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
