const {
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
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  const payerInitialBalance = await fixture.token.balanceOf(fixture.payer.address);
  const arbiterDeal = await createDeal(fixture, { saltLabel: "refund-by-arbiter" });
  await approveAndDeposit(fixture, arbiterDeal);
  await (await fixture.escrow.connect(fixture.admin).refund(arbiterDeal.dealId)).wait();

  const refundedDeal = await fixture.escrow.deals(arbiterDeal.dealId);
  assertStatus(refundedDeal, Status.Refunded, "Deal");
  assert.equal(
    await fixture.token.balanceOf(fixture.payer.address),
    payerInitialBalance,
    "Payer must recover full balance after refund"
  );

  const deadlineDeal = await createDeal(fixture, {
    arbiter: "0x0000000000000000000000000000000000000000",
    deadline: nowSeconds() + 120,
    saltLabel: "refund-by-deadline"
  });
  await approveAndDeposit(fixture, deadlineDeal);

  await expectRevert(
    fixture.escrow.connect(fixture.admin).refund(deadlineDeal.dealId),
    "Refund not allowed"
  );

  await increaseTime(180);
  await (await fixture.escrow.connect(fixture.admin).refund(deadlineDeal.dealId)).wait();

  const refundedByDeadline = await fixture.escrow.deals(deadlineDeal.dealId);
  assertStatus(refundedByDeadline, Status.Refunded, "Deadline deal");

  printSuccess("refundTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
